export interface Unit {
    id: string;
    unit_name?: string;
    unit_number: string;
    property: string;
    created: string;
    updated: string;
}

export interface UnitCreate {
    unit_name?: string;
    unit_number: string;
    property: string;
}

export interface UnitUpdate extends Partial<UnitCreate> {}

export interface UnitFormData {
    unit_name: string;
    unit_number: string;
    property: string;
}