import { ChevronDown, Plus, Search } from "lucide-react";
import { useEffect, useState } from "react";
import type { Profile } from "../lib/api";
import { BrandMark } from "./BrandMark";
import { StatusIndicator } from "./StatusIndicator";

const UNGROUPED_LABEL = "Ungrouped";
const COLLAPSED_GROUPS_STORAGE_KEY = "haune-browser-collapsed-groups";

interface ProfileListProps {
  profiles: Profile[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
}

export function ProfileList({ profiles, selectedId, onSelect, onNew }: ProfileListProps) {
  const [search, setSearch] = useState("");
  const [collapsedGroups, setCollapsedGroups] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];

    try {
      const stored = window.localStorage.getItem(COLLAPSED_GROUPS_STORAGE_KEY);
      if (!stored) return [];

      const parsed = JSON.parse(stored);
      return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === "string") : [];
    } catch {
      return [];
    }
  });

  const filtered = profiles.filter((p) => {
    const matchesSearch = [p.name, p.group ?? ""].some((value) =>
      value.toLowerCase().includes(search.toLowerCase()),
    );
    return matchesSearch;
  });

  const groupedProfiles = filtered.reduce<Array<{ group: string; profiles: Profile[] }>>((sections, profile) => {
    const groupName = profile.group?.trim() || UNGROUPED_LABEL;
    const existingSection = sections.find((section) => section.group === groupName);

    if (existingSection) {
      existingSection.profiles.push(profile);
      return sections;
    }

    sections.push({ group: groupName, profiles: [profile] });
    return sections;
  }, []).sort((a, b) => {
    if (a.group === UNGROUPED_LABEL) return 1;
    if (b.group === UNGROUPED_LABEL) return -1;
    return a.group.localeCompare(b.group);
  });

  const runningCount = profiles.filter((p) => p.status === "running").length;

  useEffect(() => {
    const availableGroups = new Set(groupedProfiles.map((section) => section.group));
    setCollapsedGroups((prev) => prev.filter((group) => availableGroups.has(group)));
  }, [groupedProfiles]);

  useEffect(() => {
    window.localStorage.setItem(COLLAPSED_GROUPS_STORAGE_KEY, JSON.stringify(collapsedGroups));
  }, [collapsedGroups]);

  useEffect(() => {
    if (!selectedId) return;

    const selectedGroup = groupedProfiles.find((section) =>
      section.profiles.some((profile) => profile.id === selectedId),
    )?.group;

    if (!selectedGroup) return;

    setCollapsedGroups((prev) => prev.filter((group) => group !== selectedGroup));
  }, [groupedProfiles, selectedId]);

  const toggleGroup = (group: string) => {
    setCollapsedGroups((prev) => (
      prev.includes(group)
        ? prev.filter((item) => item !== group)
        : [...prev, group]
    ));
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2 mb-3">
          <BrandMark className="h-5 w-5 flex-shrink-0" />
          <h1 className="text-sm font-semibold tracking-tight">Haune Browser</h1>
        </div>
        {runningCount > 0 && (
          <div className="text-xs text-gray-500 mb-3">
            {runningCount} running
          </div>
        )}
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-500" />
          <input
            type="text"
            placeholder="Search profile or group..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-8 py-1.5 text-xs"
          />
        </div>
        {groupedProfiles.length > 0 && (
          <div className="mt-3 text-[10px] text-gray-500">
            {groupedProfiles.length} group{groupedProfiles.length === 1 ? "" : "s"}
          </div>
        )}
      </div>

      {/* Profile list */}
      <div className="flex-1 overflow-y-auto p-2">
        {filtered.length === 0 && (
          <div className="text-center text-gray-500 text-xs py-8">
            {profiles.length === 0 ? "No profiles yet" : "No matches"}
          </div>
        )}
        {groupedProfiles.map((section) => (
          <section key={section.group} className="mb-3 last:mb-0">
            {(() => {
              const isCollapsed = collapsedGroups.includes(section.group);

              return (
                <>
                  <button
                    type="button"
                    onClick={() => toggleGroup(section.group)}
                    className="sticky top-0 z-10 w-full px-2 py-1.5 mb-1 bg-surface-1/95 backdrop-blur supports-[backdrop-filter]:bg-surface-1/75 rounded-md hover:bg-surface-2/95 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <ChevronDown
                          className={`h-3.5 w-3.5 text-gray-500 transition-transform duration-200 ${isCollapsed ? "-rotate-90" : "rotate-0"}`}
                        />
                        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500 truncate">
                          {section.group}
                        </span>
                      </div>
                      <span className="text-[10px] text-gray-600">
                        {section.profiles.length}
                      </span>
                    </div>
                  </button>
                  <div
                    className="grid transition-[grid-template-rows,opacity] duration-200 ease-out"
                    style={{
                      gridTemplateRows: isCollapsed ? "0fr" : "1fr",
                      opacity: isCollapsed ? 0 : 1,
                    }}
                  >
                    <div className="overflow-hidden">
                      {section.profiles.map((profile) => (
                        <button
                          key={profile.id}
                          onClick={() => onSelect(profile.id)}
                          className={`w-full text-left px-3 py-2.5 rounded-md mb-1 transition-colors ${
                            selectedId === profile.id
                              ? "bg-surface-3 border border-border-hover"
                              : "hover:bg-surface-2 border border-transparent"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <StatusIndicator status={profile.status} />
                            <span className="text-sm font-medium truncate">{profile.name}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-1 ml-4">
                            <span className="text-xs text-gray-500 capitalize">{profile.platform}</span>
                            {profile.proxy && (
                              <>
                                <span className="text-xs text-gray-600">·</span>
                                <span className="text-xs text-gray-500">Proxy</span>
                              </>
                            )}
                          </div>
                          {profile.tags.length > 0 && (
                            <div className="flex gap-1 mt-1.5 ml-4 flex-wrap">
                              {profile.tags.map((t) => (
                                <span
                                  key={t.tag}
                                  className="text-[10px] px-1.5 py-0.5 rounded-full bg-surface-4 text-gray-400"
                                  style={t.color ? { backgroundColor: `${t.color}20`, color: t.color } : undefined}
                                >
                                  {t.tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              );
            })()}
          </section>
        ))}
      </div>

      {/* New profile button */}
      <div className="p-3 border-t border-border">
        <button onClick={onNew} className="btn-secondary w-full flex items-center justify-center gap-1.5">
          <Plus className="h-3.5 w-3.5" />
          <span>New Profile</span>
        </button>
      </div>
    </div>
  );
}
