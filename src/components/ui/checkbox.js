import * as React from "react";
import { cn } from "@/lib/utils";

const Checkbox = React.forwardRef(
  ({ className, checked, onCheckedChange, ...props }, ref) => {
    const [isChecked, setIsChecked] = React.useState(checked || false);

    React.useEffect(() => {
      setIsChecked(checked || false);
    }, [checked]);

    const handleClick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      const newValue = !isChecked;
      setIsChecked(newValue);
      if (onCheckedChange) {
        onCheckedChange(newValue);
      }
    };

    return (
      <button
        type="button"
        ref={ref}
        role="checkbox"
        aria-checked={isChecked}
        onClick={handleClick}
        className={cn(
          "relative h-5 w-5 shrink-0 rounded border-2 transition-all duration-200 flex items-center justify-center cursor-pointer",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50",
          isChecked 
            ? "bg-blue-600 border-blue-600" 
            : "bg-white border-gray-400 hover:border-blue-500 hover:bg-gray-50",
          className
        )}
        data-state={isChecked ? "checked" : "unchecked"}
        {...props}
      >
        {isChecked && (
          <svg
            className="h-3.5 w-3.5 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={3}
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 13l4 4L19 7"
            />
          </svg>
        )}
      </button>
    );
  }
);
Checkbox.displayName = "Checkbox";

export { Checkbox };

