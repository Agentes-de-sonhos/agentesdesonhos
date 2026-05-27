import * as React from "react";
import PhoneInputBase from "react-phone-number-input";
import "react-phone-number-input/style.css";
import { cn } from "@/lib/utils";

interface InternationalPhoneInputProps {
  value?: string;
  onChange: (value: string | undefined) => void;
  placeholder?: string;
  defaultCountry?: any;
  className?: string;
  id?: string;
  disabled?: boolean;
}

/**
 * Phone input with country selector. Defaults to Brazil but supports any country.
 * Stores value as E.164 (e.g. "+5511999999999").
 */
export const InternationalPhoneInput = React.forwardRef<
  HTMLInputElement,
  InternationalPhoneInputProps
>(({ value, onChange, placeholder, defaultCountry = "BR", className, id, disabled }, ref) => {
  return (
    <div
      className={cn(
        "flex h-10 w-full items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
        disabled && "opacity-50 cursor-not-allowed",
        className,
      )}
    >
      <PhoneInputBase
        international
        defaultCountry={defaultCountry}
        countryCallingCodeEditable={false}
        value={value || undefined}
        onChange={onChange}
        placeholder={placeholder}
        id={id}
        disabled={disabled}
        numberInputProps={{
          className:
            "flex-1 bg-transparent outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed",
        }}
        className="flex w-full items-center gap-2 [&_.PhoneInputCountry]:flex [&_.PhoneInputCountry]:items-center [&_.PhoneInputCountry]:gap-1 [&_.PhoneInputCountrySelect]:bg-transparent [&_.PhoneInputCountrySelect]:outline-none [&_.PhoneInputCountryIcon]:w-6 [&_.PhoneInputCountryIcon]:h-4 [&_.PhoneInputCountryIcon]:overflow-hidden [&_.PhoneInputCountryIcon]:rounded-sm [&_.PhoneInputCountryIcon--border]:shadow-none"
      />
    </div>
  );
});

InternationalPhoneInput.displayName = "InternationalPhoneInput";