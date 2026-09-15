import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ArrowRightIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from '@heroicons/react/24/outline';
import { Card } from './ui';
import type { AuditLog } from '../lib/types/flow.types';
import {
  MAX_VALUE_LENGTH,
  formatAuditValue,
  resolveAuditTitleKey,
  type AuditDiffEntry,
  type AuditValueContext,
} from './auditFormat';

interface AuditActivityCardProps {
  log: AuditLog;
  actorName: string;
  resolveUserName: (id: string) => string;
}

export function AuditActivityCard({
  log,
  actorName,
  resolveUserName,
}: AuditActivityCardProps) {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);

  const title = t(resolveAuditTitleKey(log.action));
  const created = new Date(log.created_at);
  const timestamp = Number.isNaN(created.getTime())
    ? ''
    : created.toLocaleString(i18n.language);

  const diff = log.diff ?? null;
  const hasDiff = diff !== null && Object.keys(diff).length > 0;

  const ctx: AuditValueContext = {
    t,
    locale: i18n.language,
    resourceType: log.resource_type,
    resolveUserName,
  };

  return (
    <Card padding="none">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 rounded-card px-4 py-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
      >
        <span className="text-sm font-medium text-text-primary">{title}</span>
        <span className="flex shrink-0 items-center gap-2 text-xs text-text-secondary">
          <span className="whitespace-nowrap">{timestamp}</span>
          {open ? (
            <ChevronUpIcon className="h-4 w-4" aria-hidden="true" />
          ) : (
            <ChevronDownIcon className="h-4 w-4" aria-hidden="true" />
          )}
        </span>
      </button>

      {open && (
        <div className="border-t border-border-default px-4 pb-4 pt-3">
          <p className="text-xs text-text-secondary">
            {actorName}
            <span className="mx-1 text-text-secondary/60">·</span>
            {t(`staff.roles.${log.actor_role}`, {
              defaultValue: log.actor_role,
            })}
          </p>

          {hasDiff && (
            <dl className="mt-3 space-y-2">
              {Object.entries(diff as Record<string, AuditDiffEntry>).map(
                ([field, change]) => (
                  <ChangeRow
                    key={field}
                    field={field}
                    change={change}
                    ctx={ctx}
                  />
                ),
              )}
            </dl>
          )}
        </div>
      )}
    </Card>
  );
}

function ChangeRow({
  field,
  change,
  ctx,
}: {
  field: string;
  change: AuditDiffEntry;
  ctx: AuditValueContext;
}) {
  const { t } = useTranslation();
  const label = t(`audit.fields.${field}`, { defaultValue: field });
  const before = formatAuditValue(field, change.from, ctx);
  const after = formatAuditValue(field, change.to, ctx);

  return (
    <div className="rounded-control bg-bg-canvas px-3 py-2">
      <dt className="text-xs font-medium text-text-secondary">{label}</dt>
      <dd className="mt-1 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-start gap-x-2 gap-y-1">
        <div className="min-w-0">
          <span className="block text-[11px] font-medium uppercase tracking-wide text-text-secondary">
            {t('audit.before')}
          </span>
          <TruncatedText text={before} variant="before" />
        </div>
        <ArrowRightIcon
          className="mt-4 h-4 w-4 shrink-0 self-center text-text-secondary"
          aria-hidden="true"
        />
        <div className="min-w-0">
          <span className="block text-[11px] font-medium uppercase tracking-wide text-text-secondary">
            {t('audit.after')}
          </span>
          <TruncatedText text={after} variant="after" />
        </div>
      </dd>
    </div>
  );
}

function TruncatedText({
  text,
  variant,
}: {
  text: string;
  variant: 'before' | 'after';
}) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const isLong = text.length > MAX_VALUE_LENGTH;
  const shown =
    isLong && !expanded ? `${text.slice(0, MAX_VALUE_LENGTH)}\u2026` : text;

  const valueClass =
    variant === 'before'
      ? 'text-sm text-text-secondary line-through decoration-text-secondary/50'
      : 'text-sm font-medium text-text-primary';

  return (
    <span className={`wrap-break-word ${valueClass}`}>
      {shown}
      {isLong && (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="ml-1 align-baseline text-xs font-medium text-primary hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
        >
          {expanded ? t('audit.showLess') : t('audit.showMore')}
        </button>
      )}
    </span>
  );
}