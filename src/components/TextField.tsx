interface TextFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  placeholder?: string;
}

export function TextField({ label, value, onChange, multiline, placeholder }: TextFieldProps) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {multiline ? (
        <textarea
          className="field min-h-24 resize-y"
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          value={value}
        />
      ) : (
        <input
          className="field"
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          type="text"
          value={value}
        />
      )}
    </label>
  );
}
