import * as React from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { countries } from "@/lib/countries";

interface CountrySelectorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
}

export function CountrySelector({ value, onChange, disabled, className }: CountrySelectorProps) {
  const [open, setOpen] = React.useState(false);

  const selectedCountry = countries.find((country) => country.code === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between h-12 rounded-xl text-sm font-normal",
            className
          )}
        >
          {selectedCountry ? selectedCountry.name : "Selecione o país..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 rounded-xl overflow-hidden shadow-xl border-border/40" align="start" side="bottom" sideOffset={4} avoidCollisions={false}>
        <Command className="rounded-xl">
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <CommandInput placeholder="Procurar país..." className="h-10 border-none focus:ring-0 w-full" />
          </div>
          <CommandList className="max-h-[300px]">
            <CommandEmpty>Nenhum país encontrado.</CommandEmpty>
            <CommandGroup>
              {countries.map((country) => (
                <CommandItem
                  key={country.code}
                  value={country.name}
                  onSelect={() => {
                    onChange(country.code);
                    setOpen(false);
                  }}
                  className="cursor-pointer py-3 px-4 aria-selected:bg-accent flex items-center group"
                >
                  <div className="flex items-center flex-1 mr-4 overflow-hidden">
                    <Check
                      className={cn(
                        "mr-3 h-4 w-4 shrink-0",
                        value === country.code ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <span className="truncate">{country.name}</span>
                  </div>
                  <span className="shrink-0 text-[11px] font-bold text-muted-foreground group-aria-selected:text-foreground transition-colors bg-muted/50 px-1.5 py-0.5 rounded">
                    {country.ddi}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
