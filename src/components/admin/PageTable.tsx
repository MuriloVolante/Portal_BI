"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
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
import { PageHeader } from "./PageHeader";
import { ConfirmDialog } from "./ConfirmDialog";
import { getPageIcon, isKnownPageIcon, PAGE_ICON_NAMES } from "@/lib/icons";
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
    .replace(/[̀-ͯ]/g, "")
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
  const [toDelete, setToDelete] = useState<SidebarPage | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, startDelete] = useTransition();

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

  function confirmDelete() {
    if (!toDelete) return;
    setDeleteError(null);
    startDelete(async () => {
      const result = await deletePage(toDelete.id);
      if (result.error) {
        setDeleteError(result.error);
        return;
      }
      setToDelete(null);
      router.refresh();
    });
  }

  const PreviewIcon = getPageIcon(form.icon);
  const iconUnknown = form.icon.trim() !== "" && !isKnownPageIcon(form.icon);

  return (
    <>
      <PageHeader
        title="Páginas"
        description="Cadastre e gerencie os dashboards disponíveis no portal."
        actions={
          <Button onClick={openCreate}>
            <Plus />
            Nova página
          </Button>
        }
      />

      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-5">Painel</TableHead>
              <TableHead className="hidden md:table-cell">Endereço</TableHead>
              <TableHead className="hidden md:table-cell">Ordem</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="pr-5 text-right">
                <span className="sr-only">Ações</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pages.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  Nenhuma página cadastrada.
                </TableCell>
              </TableRow>
            ) : (
              pages.map((page, i) => {
                const Icon = getPageIcon(page.icon);
                return (
                  <TableRow key={page.id} className="stagger" style={{ "--i": i } as React.CSSProperties}>
                    <TableCell className="pl-5">
                      <div className="flex items-center gap-3">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
                          <Icon className="h-4 w-4" />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-medium">{page.label}</p>
                          <p className="truncate font-mono text-xs text-tertiary md:hidden">/{page.slug}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden font-mono text-[13px] text-muted-foreground md:table-cell">
                      /dashboard/{page.slug}
                    </TableCell>
                    <TableCell className="hidden tabular-nums md:table-cell">{page.order}</TableCell>
                    <TableCell>
                      <Badge variant={page.is_active ? "default" : "warning"}>
                        {page.is_active ? "ativa" : "inativa"}
                      </Badge>
                    </TableCell>
                    <TableCell className="pr-5 text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => openEdit(page)}>
                          <Pencil className="!size-3.5" />
                          <span className="hidden sm:inline">Editar</span>
                          <span className="sr-only sm:hidden">Editar {page.label}</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setDeleteError(null);
                            setToDelete(page);
                          }}
                          className="text-muted-foreground hover:bg-destructive/15 hover:text-destructive"
                          aria-label={`Excluir ${page.label}`}
                        >
                          <Trash2 className="!size-3.5" />
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

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Excluir este painel?"
        description={
          <>
            <span className="text-foreground">{toDelete?.label}</span> sai do portal e as liberações de todos os
            usuários para ele são removidas. Essa ação é permanente.
          </>
        }
        confirmLabel="Excluir painel"
        destructive
        pending={deleting}
        error={deleteError}
        onConfirm={confirmDelete}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar página" : "Nova página"}</DialogTitle>
            <DialogDescription>
              {editing ? "Atualize os dados do dashboard." : "Cadastre um novo dashboard Power BI."}
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
                <span className="font-mono text-foreground">/dashboard/{form.slug || "vendas"}</span>. Não cole a URL do
                Power BI aqui — ela vai no campo abaixo.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="embed_url">URL de embed (Power BI)</Label>
              <Input
                id="embed_url"
                type="password"
                value={form.embed_url}
                onChange={(e) => setForm({ ...form, embed_url: e.target.value })}
                placeholder={editing ? "•••••• (deixe vazio para manter)" : "https://app.powerbi.com/view?r=..."}
                autoComplete="off"
                required={!editing}
              />
            </div>
            <div className="grid grid-cols-[1fr_96px] gap-4">
              <div className="space-y-2">
                <Label htmlFor="icon">Ícone</Label>
                <div className="flex gap-2">
                  <span
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border bg-background text-primary"
                    aria-hidden="true"
                  >
                    <PreviewIcon className="h-[18px] w-[18px]" />
                  </span>
                  <Input
                    id="icon"
                    list="page-icon-names"
                    value={form.icon}
                    onChange={(e) => setForm({ ...form, icon: e.target.value })}
                    placeholder="ChartColumnIncreasing"
                    autoComplete="off"
                  />
                  <datalist id="page-icon-names">
                    {PAGE_ICON_NAMES.map((name) => (
                      <option key={name} value={name} />
                    ))}
                  </datalist>
                </div>
                {iconUnknown && (
                  <p className="text-xs text-warning">Ícone não reconhecido — será usado o ícone padrão.</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="order">Ordem</Label>
                <Input
                  id="order"
                  type="number"
                  value={form.order}
                  onChange={(e) => setForm({ ...form, order: Number(e.target.value) })}
                />
              </div>
            </div>
            <label
              htmlFor="is_active"
              className="flex cursor-pointer items-center justify-between rounded-[10px] border bg-background/50 px-3 py-3"
            >
              <span className="text-sm font-medium">Página ativa</span>
              <Switch
                id="is_active"
                checked={form.is_active}
                onCheckedChange={(v) => setForm({ ...form, is_active: v })}
              />
            </label>

            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
                Cancelar
              </Button>
              <Button type="submit" disabled={pending}>
                {pending && <Loader2 className="animate-spin" />}
                {editing ? "Salvar" : "Criar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
