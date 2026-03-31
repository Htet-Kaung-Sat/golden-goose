// General
export const requiredMsg = () => "v_required";
export const notSpaceMsg = () => "v_not_space";
export const mismatchMsg = (field1: string, field2: string) =>
  `v_mismatch:${field1},${field2}`;
export const minLengthMsg = (len: number) => `v_min_length:${len}`;
export const maxLengthMsg = (len: number) => `v_max_length:${len}`;
export const noSpecialCharacterMsg = () => "v_no_special_character";
export const noCapitalLetterMsg = () => "v_no_capital_letter";

// Password
export const passwordMatchMsg = (field1: string, field2: string) =>
  `v_password_match:${field1},${field2}`;
export const passwordEqualMsg = (field1: string, field2: string) =>
  `v_password_equal:${field1},${field2}`;
export const strongPasswordMsg = () => "v_password_strong";

// Generic pattern / regex
export const patternMismatchMsg = (format: string) =>
  `v_pattern_mismatch:${format}`;
export const typeErrorMsg = (field: string, type: string) =>
  `v_type_error:${field},${type}`;

// Email
export const invalidEmailMsg = () => "v_invalid_email";

// Numbers
export const minValueMsg = (min: number) => `v_min_value:${min}`;
export const maxValueMsg = (max: number) => `v_max_value:${max}`;
export const integerMsg = () => "v_integer";

// Select / Dropdown
export const selectRequiredMsg = () => "v_select_required";

// Checkbox / Radio
export const checkboxRequiredMsg = () => "v_checkbox_required";
export const radioRequiredMsg = () => "v_radio_required";

// URL
export const invalidUrlMsg = () => "v_invalid_url";

// File Upload
export const fileRequiredMsg = () => "v_file_required";
export const fileSizeMsg = (sizeMB: number) => `v_file_size:${sizeMB}`;
export const fileTypeMsg = (types: string) => `v_file_type:${types}`;

// Date
export const dateRequiredMsg = () => "v_date_required";
export const minDateMsg = (date: string) => `v_min_date:${date}`;
export const maxDateMsg = (date: string) => `v_max_date:${date}`;

// format
export const formatMsg = () => `v_fromat_msg`;

// range
export const rangeMsg = () => `v_range_msg`;
