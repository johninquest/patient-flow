<script lang="ts">
  interface Props {
    id: string;
    label: string;
    type?: 'text' | 'email' | 'password' | 'tel' | 'number' | 'url' | 'date' | 'time' | 'datetime-local';
    value?: string;
    placeholder?: string;
    required?: boolean;
    disabled?: boolean;
    error?: string;
    class?: string;
  }

  let { type = 'text', id, label, value = $bindable(''), required = false, placeholder = '' }: Props = $props();
</script>

<div class="mb-4">
  <label for={id} class="block mb-1.5 text-sm font-medium text-gray-700">
    {label}
  </label>
  <input
    {type}
    {id}
    {required}
    {placeholder}
    bind:value
    class="
      w-full px-3 py-2
      border border-gray-300 rounded-md
      focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
      transition-shadow duration-200
    "
  />
</div>