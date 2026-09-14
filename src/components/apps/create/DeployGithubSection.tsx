import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface DeployGithubSectionProps {
  gitRepo: string;
  onChangeGitRepo: (val: string) => void;
  gitBranch: string;
  onChangeGitBranch: (val: string) => void;
  buildPack: "nixpacks" | "dockerfile";
  onChangeBuildPack: (val: "nixpacks" | "dockerfile") => void;
}

export function DeployGithubSection({
  gitRepo,
  onChangeGitRepo,
  gitBranch,
  onChangeGitBranch,
  buildPack,
  onChangeBuildPack,
}: DeployGithubSectionProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-xs">URL do Repositório (Público ou Privado)</Label>
        <Input
          value={gitRepo}
          onChange={(e) => onChangeGitRepo(e.target.value)}
          placeholder="https://github.com/usuario/meu-bot"
          className="rounded-xl font-mono text-xs"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label className="text-xs">Branch</Label>
          <Input
            value={gitBranch}
            onChange={(e) => onChangeGitBranch(e.target.value)}
            placeholder="main"
            className="rounded-xl font-mono text-xs"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs">Motor de Build</Label>
          <select
            value={buildPack}
            onChange={(e) => onChangeBuildPack(e.target.value as "nixpacks" | "dockerfile")}
            className="w-full h-10 px-3 rounded-xl border bg-background text-xs font-semibold cursor-pointer"
          >
            <option value="nixpacks">Nixpacks (Auto-detect)</option>
            <option value="dockerfile">Dockerfile Customizado</option>
          </select>
        </div>
      </div>
    </div>
  );
}
