import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ShieldCheck } from "lucide-react";
import type { IFileInfo } from "@/lib/file-manager/types";

interface ChmodModalProps {
  isOpen: boolean;
  onClose: () => void;
  file: IFileInfo | null;
  onSave: (path: string, modeOctal: string) => Promise<void>;
  isLoading?: boolean;
}

export function ChmodModal({ isOpen, onClose, file, onSave, isLoading }: ChmodModalProps) {
  // Matriz de permissões
  const [ownerRead, setOwnerRead] = useState(true);
  const [ownerWrite, setOwnerWrite] = useState(true);
  const [ownerExec, setOwnerExec] = useState(false);

  const [groupRead, setGroupRead] = useState(true);
  const [groupWrite, setGroupWrite] = useState(false);
  const [groupExec, setGroupExec] = useState(false);

  const [othersRead, setOthersRead] = useState(true);
  const [othersWrite, setOthersWrite] = useState(false);
  const [othersExec, setOthersExec] = useState(false);

  const [octalInput, setOctalInput] = useState("0644");

  // Atualiza estados quando o arquivo muda
  useEffect(() => {
    if (file) {
      const perms = file.permissions.replace(/^0+/, "") || "644";
      const cleanOctal = perms.padStart(3, "0");
      setOctalInput(`0${cleanOctal}`);

      const o = parseInt(cleanOctal[0] || "6", 10);
      const g = parseInt(cleanOctal[1] || "4", 10);
      const ot = parseInt(cleanOctal[2] || "4", 10);

      setOwnerRead(Boolean(o & 4));
      setOwnerWrite(Boolean(o & 2));
      setOwnerExec(Boolean(o & 1));

      setGroupRead(Boolean(g & 4));
      setGroupWrite(Boolean(g & 2));
      setGroupExec(Boolean(g & 1));

      setOthersRead(Boolean(ot & 4));
      setOthersWrite(Boolean(ot & 2));
      setOthersExec(Boolean(ot & 1));
    }
  }, [file]);

  // Recalcula octal quando os checkboxes mudam
  const updateFromCheckboxes = (
    or: boolean, ow: boolean, ox: boolean,
    gr: boolean, gw: boolean, gx: boolean,
    otr: boolean, otw: boolean, otx: boolean
  ) => {
    const o = (or ? 4 : 0) + (ow ? 2 : 0) + (ox ? 1 : 0);
    const g = (gr ? 4 : 0) + (gw ? 2 : 0) + (gx ? 1 : 0);
    const ot = (otr ? 4 : 0) + (otw ? 2 : 0) + (otx ? 1 : 0);
    setOctalInput(`0${o}${g}${ot}`);
  };

  const handleOctalChange = (val: string) => {
    const clean = val.replace(/[^0-7]/g, "").slice(0, 4);
    setOctalInput(clean);
    const digits = clean.replace(/^0/, "").padStart(3, "0");
    if (digits.length === 3) {
      const o = parseInt(digits[0]!, 10);
      const g = parseInt(digits[1]!, 10);
      const ot = parseInt(digits[2]!, 10);

      setOwnerRead(Boolean(o & 4));
      setOwnerWrite(Boolean(o & 2));
      setOwnerExec(Boolean(o & 1));

      setGroupRead(Boolean(g & 4));
      setGroupWrite(Boolean(g & 2));
      setGroupExec(Boolean(g & 1));

      setOthersRead(Boolean(ot & 4));
      setOthersWrite(Boolean(ot & 2));
      setOthersExec(Boolean(ot & 1));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    await onSave(file.path, octalInput);
    onClose();
  };

  if (!file) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="rounded-3xl max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" /> Permissões Linux (chmod)
          </DialogTitle>
          <DialogDescription className="text-xs">
            Altere os bits de leitura, escrita e execução para <strong>{file.name}</strong>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Tabela Visual de Permissões */}
          <div className="border rounded-2xl p-4 bg-muted/20 space-y-3">
            <div className="grid grid-cols-4 gap-2 text-xs font-bold text-center border-b pb-2 text-muted-foreground">
              <span className="text-left">Nível</span>
              <span>Ler (r)</span>
              <span>Escrever (w)</span>
              <span>Executar (x)</span>
            </div>

            {/* Proprietário (Owner) */}
            <div className="grid grid-cols-4 gap-2 items-center text-xs text-center">
              <span className="text-left font-semibold">Proprietário</span>
              <div className="flex justify-center">
                <Checkbox
                  checked={ownerRead}
                  onCheckedChange={(c) => {
                    const val = Boolean(c);
                    setOwnerRead(val);
                    updateFromCheckboxes(val, ownerWrite, ownerExec, groupRead, groupWrite, groupExec, othersRead, othersWrite, othersExec);
                  }}
                />
              </div>
              <div className="flex justify-center">
                <Checkbox
                  checked={ownerWrite}
                  onCheckedChange={(c) => {
                    const val = Boolean(c);
                    setOwnerWrite(val);
                    updateFromCheckboxes(ownerRead, val, ownerExec, groupRead, groupWrite, groupExec, othersRead, othersWrite, othersExec);
                  }}
                />
              </div>
              <div className="flex justify-center">
                <Checkbox
                  checked={ownerExec}
                  onCheckedChange={(c) => {
                    const val = Boolean(c);
                    setOwnerExec(val);
                    updateFromCheckboxes(ownerRead, ownerWrite, val, groupRead, groupWrite, groupExec, othersRead, othersWrite, othersExec);
                  }}
                />
              </div>
            </div>

            {/* Grupo (Group) */}
            <div className="grid grid-cols-4 gap-2 items-center text-xs text-center">
              <span className="text-left font-semibold">Grupo</span>
              <div className="flex justify-center">
                <Checkbox
                  checked={groupRead}
                  onCheckedChange={(c) => {
                    const val = Boolean(c);
                    setGroupRead(val);
                    updateFromCheckboxes(ownerRead, ownerWrite, ownerExec, val, groupWrite, groupExec, othersRead, othersWrite, othersExec);
                  }}
                />
              </div>
              <div className="flex justify-center">
                <Checkbox
                  checked={groupWrite}
                  onCheckedChange={(c) => {
                    const val = Boolean(c);
                    setGroupWrite(val);
                    updateFromCheckboxes(ownerRead, ownerWrite, ownerExec, groupRead, val, groupExec, othersRead, othersWrite, othersExec);
                  }}
                />
              </div>
              <div className="flex justify-center">
                <Checkbox
                  checked={groupExec}
                  onCheckedChange={(c) => {
                    const val = Boolean(c);
                    setGroupExec(val);
                    updateFromCheckboxes(ownerRead, ownerWrite, ownerExec, groupRead, groupWrite, val, othersRead, othersWrite, othersExec);
                  }}
                />
              </div>
            </div>

            {/* Outros (Others / Public) */}
            <div className="grid grid-cols-4 gap-2 items-center text-xs text-center">
              <span className="text-left font-semibold">Outros / Público</span>
              <div className="flex justify-center">
                <Checkbox
                  checked={othersRead}
                  onCheckedChange={(c) => {
                    const val = Boolean(c);
                    setOthersRead(val);
                    updateFromCheckboxes(ownerRead, ownerWrite, ownerExec, groupRead, groupWrite, groupExec, val, othersWrite, othersExec);
                  }}
                />
              </div>
              <div className="flex justify-center">
                <Checkbox
                  checked={othersWrite}
                  onCheckedChange={(c) => {
                    const val = Boolean(c);
                    setOthersWrite(val);
                    updateFromCheckboxes(ownerRead, ownerWrite, ownerExec, groupRead, groupWrite, groupExec, othersRead, val, othersExec);
                  }}
                />
              </div>
              <div className="flex justify-center">
                <Checkbox
                  checked={othersExec}
                  onCheckedChange={(c) => {
                    const val = Boolean(c);
                    setOthersExec(val);
                    updateFromCheckboxes(ownerRead, ownerWrite, ownerExec, groupRead, groupWrite, groupExec, othersRead, othersWrite, val);
                  }}
                />
              </div>
            </div>
          </div>

          {/* Campo Numérico Octal */}
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1 flex-1">
              <Label className="text-xs">Modo Octal Numérico</Label>
              <Input
                value={octalInput}
                onChange={(e) => handleOctalChange(e.target.value)}
                placeholder="0755"
                className="font-mono text-sm rounded-xl"
              />
            </div>
            <div className="space-y-1 text-right">
              <Label className="text-xs text-muted-foreground">Padrão Recomendado</Label>
              <div className="flex gap-1.5">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => handleOctalChange("0644")}
                  className="rounded-lg text-xs h-7 px-2"
                >
                  644 (Arquivos)
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => handleOctalChange("0755")}
                  className="rounded-lg text-xs h-7 px-2"
                >
                  755 (Pastas)
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="rounded-xl">
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading} className="rounded-xl font-bold bg-primary">
              {isLoading ? "Salvando..." : "Alterar Permissões"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
