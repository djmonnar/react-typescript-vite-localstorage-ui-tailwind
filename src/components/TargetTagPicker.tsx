interface TargetTagPickerProps {
  availableTags: string[];
  selectedTags: string[];
  onChange: (tags: string[]) => void;
}

export function TargetTagPicker({ availableTags, selectedTags, onChange }: TargetTagPickerProps) {
  const toggleTag = (tag: string) => {
    onChange(selectedTags.includes(tag) ? selectedTags.filter((item) => item !== tag) : [...selectedTags, tag]);
  };

  return (
    <div className="rounded-md border border-line bg-[#10151f] p-3">
      <div className="mb-2 space-y-1">
        <span className="label">대상 태그 제한</span>
        <p className="text-xs leading-relaxed text-muted">
          비워두면 모든 대상에게 적용됩니다. 태그를 고르면 해당 태그를 가진 대상에게만 스킬이 적용됩니다.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {availableTags.map((tag) => {
          const checked = selectedTags.includes(tag);
          return (
            <button
              className={`min-h-11 rounded-md border px-3 py-2 text-sm font-semibold ${checked ? 'border-cyan bg-cyan/15 text-cyan' : 'border-line bg-[#0f141d] text-muted'}`}
              key={tag}
              onClick={() => toggleTag(tag)}
              type="button"
            >
              {tag}
            </button>
          );
        })}
      </div>
    </div>
  );
}
