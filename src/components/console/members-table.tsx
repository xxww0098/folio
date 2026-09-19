import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ROLE_LABEL, ROLES, type Role, type MemberRow } from "@/lib/roles";
import type { SubscriberRow } from "@/lib/membership/server";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const PAGE_SIZE = 10;

function isActiveMember(subscribers: SubscriberRow[], userId: string) {
  return subscribers.some((item) => item.userId === userId && item.status === "active");
}

export function MembersTable({
  members,
  subscribers,
  busy,
  onRole,
  onGrant,
  onRevoke,
  onBulkRole,
  onBulkGrant,
  onBulkRevoke,
}: {
  members: MemberRow[];
  subscribers: SubscriberRow[];
  busy: string | null;
  onRole: (userId: string, role: Role) => void;
  onGrant: (userId: string) => void;
  onRevoke: (userId: string) => void;
  onBulkRole: (ids: string[], role: Role) => void;
  onBulkGrant: (ids: string[]) => void;
  onBulkRevoke: (ids: string[]) => void;
}) {
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("all");
  const [plan, setPlan] = useState("all");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string[]>([]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return members.filter((member) => {
      if (role !== "all" && member.role !== role) return false;
      const paid = isActiveMember(subscribers, member.id);
      if (plan === "paid" && !paid) return false;
      if (plan === "free" && paid) return false;
      if (!q) return true;
      return `${member.name} ${member.email ?? ""}`.toLowerCase().includes(q);
    });
  }, [members, plan, query, role, subscribers]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const slice = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
  const pageIds = slice.map((member) => member.id);
  const selectedOnPage = pageIds.filter((id) => selected.includes(id));
  const allOnPage = slice.length > 0 && selectedOnPage.length === slice.length;
  const someOnPage = selectedOnPage.length > 0 && !allOnPage;
  const selectedIds = selected.filter((id) => filtered.some((member) => member.id === id));

  function resetPage() {
    setPage(1);
    setSelected([]);
  }

  function toggleAll() {
    if (allOnPage) {
      setSelected((currentIds) => currentIds.filter((id) => !pageIds.includes(id)));
      return;
    }
    setSelected((currentIds) => [...new Set([...currentIds, ...pageIds])]);
  }

  function toggleOne(id: string) {
    setSelected((currentIds) => (currentIds.includes(id) ? currentIds.filter((item) => item !== id) : [...currentIds, id]));
  }

  return (
    <div>
      <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center">
        <Input
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            resetPage();
          }}
          placeholder="搜索姓名或邮箱"
          className="h-10 bg-console-card sm:max-w-xs"
        />
        <Select
          value={role}
          onValueChange={(value) => {
            setRole(value);
            resetPage();
          }}
        >
          <SelectTrigger className="h-10 w-full bg-console-card sm:w-32">
            <SelectValue placeholder="角色" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部角色</SelectItem>
            {ROLES.map((item) => (
              <SelectItem key={item} value={item}>
                {ROLE_LABEL[item]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={plan}
          onValueChange={(value) => {
            setPlan(value);
            resetPage();
          }}
        >
          <SelectTrigger className="h-10 w-full bg-console-card sm:w-32">
            <SelectValue placeholder="会员" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部会员</SelectItem>
            <SelectItem value="paid">有效会员</SelectItem>
            <SelectItem value="free">非会员</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {selectedIds.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2 border-t border-console-line px-5 py-3 text-sm">
          <span className="text-console-muted">已选 {selectedIds.length} 人</span>
          <Button size="sm" variant="ghost" disabled={busy === "bulk-members"} onClick={() => onBulkRole(selectedIds, "reader")}>
            设为用户
          </Button>
          <Button size="sm" variant="ghost" disabled={busy === "bulk-members"} onClick={() => onBulkRole(selectedIds, "admin")}>
            设为管理员
          </Button>
          <Button size="sm" variant="ghost" disabled={busy === "bulk-members"} onClick={() => onBulkGrant(selectedIds)}>
            赠送年卡
          </Button>
          <Button size="sm" variant="ghost" disabled={busy === "bulk-members"} onClick={() => onBulkRevoke(selectedIds)}>
            取消会员
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSelected([])}>
            取消选择
          </Button>
        </div>
      ) : null}

      {filtered.length === 0 ? (
        <p className="px-5 py-10 text-sm text-console-muted">{members.length === 0 ? "还没有其他成员。" : "没有符合条件的用户。"}</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <Checkbox
                  checked={allOnPage ? true : someOnPage ? "indeterminate" : false}
                  onCheckedChange={toggleAll}
                  aria-label="全选本页"
                />
              </TableHead>
              <TableHead>用户</TableHead>
              <TableHead>邮箱</TableHead>
              <TableHead>角色</TableHead>
              <TableHead>会员</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {slice.map((member) => {
              const paid = isActiveMember(subscribers, member.id);
              return (
                <TableRow key={member.id} data-state={selected.includes(member.id) ? "selected" : undefined}>
                  <TableCell>
                    <Checkbox
                      checked={selected.includes(member.id)}
                      onCheckedChange={() => toggleOne(member.id)}
                      aria-label={`选择 ${member.name}`}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{member.name}</TableCell>
                  <TableCell className="max-w-56 truncate text-console-muted">{member.email ?? "未填写邮箱"}</TableCell>
                  <TableCell>
                    <Select value={member.role} onValueChange={(value) => onRole(member.id, value as Role)} disabled={busy === `role-${member.id}`}>
                      <SelectTrigger className="h-9 w-28">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLES.map((item) => (
                          <SelectItem key={item} value={item}>
                            {ROLE_LABEL[item]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-console-muted">{paid ? "有效会员" : "非会员"}</TableCell>
                  <TableCell className="text-right">
                    {paid ? (
                      <Button size="sm" variant="ghost" disabled={busy === `revoke-${member.id}`} onClick={() => onRevoke(member.id)}>
                        取消会员
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" disabled={busy === `grant-${member.id}`} onClick={() => onGrant(member.id)}>
                        赠送年卡
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}

      {filtered.length > PAGE_SIZE ? (
        <div className="flex items-center justify-between gap-3 px-5 py-3 text-sm text-console-muted">
          <p>
            第 {current} / {pages} 页 · 共 {filtered.length} 人
          </p>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={current <= 1} onClick={() => setPage((n) => Math.max(1, n - 1))}>
              <ChevronLeft className="size-4" />
              上一页
            </Button>
            <Button size="sm" variant="outline" disabled={current >= pages} onClick={() => setPage((n) => Math.min(pages, n + 1))}>
              下一页
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
