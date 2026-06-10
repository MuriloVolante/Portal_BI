"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  icons,
  LayoutDashboard,
  Loader2,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { createPage, deletePage, updatePage } from "@/app/(admin)/admin/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { SidebarPage } from "@/types";

interface PageTableProps {
  pages: SidebarPage[];
}

interface FormState {
  slug: string;
  label: string;
  embed_url: string;
  icon: string;
  order: number;
  is_active: boolean;
}

const emptyForm: FormState = {
  slug: "",
  label: "",
  embed_url: "",
  icon: "",
  order: 0,
  is_active: true,
};

/** Gera um slug a partir do nome: "Relatório de Vendas" -> "relatorio-de-vendas". */
function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function PageTable({ pages }: PageTableProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<SidebarPage | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [slugTouched, setSlugTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setSlugTouched(false);
    setError(null);
    setOpen(true);
  }

  function openEdit(page: SidebarPage) {
    setEditing(page);
    setForm({
      slug: page.slug,
      label: page.label,
      embed_url: "", // nunca exibida — vazio mantém a URL atual
      icon: page.icon ?? "",
      order: page.order,
      is_active: page.is_active,
    });
    setSlugTouched(true);
    setError(null);
    setOpen(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = editing
        ? await updatePage(editing.id, form)
        : await createPage(form);

      if (result.error) {
        setError(result.error);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  function handleDelete(page: SidebarPage) {
    if (
      !window.confirm(
        `Remover a página "${page.label}"? As permissões associadas também serão removidas.`
      )
    ) {
      return;
    }
    startTransition(async () => {
      await deletePage(page.id);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Nova página
        </Button>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-4">Página</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Ordem</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="pr-4 text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pages.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="h-24 text-center text-muted-foreground"
                >
                  Nenhuma página cadastrada.
                </TableCell>
              </TableRow>
            ) : (
              pages.map((page) => {
                const Icon =
                  (page.icon && icons[page.icon as keyof typeof icons]) ||
                  LayoutDashboard;
                return (
                  <TableRow key={page.id}>
                    <TableCell className="pl-4">
                      <div className="flex items-center gap-2 font-medium">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        {page.label}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {page.slug}
                    </TableCell>
                    <TableCell>{page.order}</TableCell>
                    <TableCell>
                      <Badge variant={page.is_active ? "default" : "secondary"}>
                        {page.is_active ? "ativa" : "inativa"}
                      </Badge>
                    </TableCell>
                    <TableCell className="pr-4 text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEdit(page)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Editar
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(page)}
                          disabled={pending}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing ? "Editar página" : "Nova página"}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? "Atualize os dados do dashboard."
                : "Cadastre um novo dashboard Power BI."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="label">Nome (sidebar)</Label>
              <Input
                id="label"
                value={form.label}
                onChange={(e) =>
                  setForm({
                    ...form,
                    label: e.target.value,
                    // Preenche o slug automaticamente até o usuário editá-lo
                    slug: slugTouched ? form.slug : slugify(e.target.value),
                  })
                }
                placeholder="Vendas"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">Identificador (slug)</Label>
              <Input
                id="slug"
                value={form.slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setForm({ ...form, slug: slugify(e.target.value) });
                }}
                placeholder="vendas"
                pattern="[a-z0-9-]+"
                title="Apenas letras minúsculas, números e hífens"
                required
              />
              <p className="text-xs text-muted-foreground">
                Vira o endereço da página:{" "}
                <span className="font-mono">
                  /dashboard/{form.slug || "vendas"}
                </span>
                . Não cole a URL do Power BI aqui — ela vai no campo abaixo.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="embed_url">URL de embed (Power BI)</Label>
              <Input
                id="embed_url"
                type="password"
                value={form.embed_url}
                onChange={(e) =>
                  setForm({ ...form, embed_url: e.target.value })
                }
                placeholder={
                  editing ? "•••••• (deixe vazio para manter)" : "https://app.powerbi.com/view?r=..."
                }
                autoComplete="off"
                required={!editing}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="icon">Ícone (lucide)</Label>
                <Input
                  id="icon"
                  value={form.icon}
                  onChange={(e) => setForm({ ...form, icon: e.target.value })}
                  placeholder="BarChart3"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="order">Ordem</Label>
                <Input
                  id="order"
                  type="number"
                  value={form.order}
                  onChange={(e) =>
                    setForm({ ...form, order: Number(e.target.value) })
                  }
                />
              </div>
            </div>
            <div className="flex items-center justify-between rounded-md border px-3 py-2.5">
              <Label htmlFor="is_active" className="cursor-pointer">
                Página ativa
              </Label>
              <Switch
                id="is_active"
                checked={form.is_active}
                onCheckedChange={(v) => setForm({ ...form, is_active: v })}
              />
            </div>

            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setOpen(false)}
                disabled={pending}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={pending}>
                {pending && <Loader2 className="h-4 w-4 animate-spin" />}
                {editing ? "Salvar" : "Criar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
