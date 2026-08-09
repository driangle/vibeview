import type { SessionInsights } from '../../../types';
import { SidebarSection } from '../../SidebarSection';
import type { InsightsActions } from '../actions';

/**
 * Skills loaded: one chip per skill with its count. Each carries the message that
 * loaded it, so clicking scrolls the conversation to it (or filters the track on
 * the Timeline tab).
 */
export function SkillsSection({
  skills,
  actions,
}: {
  skills: SessionInsights['skills'];
  actions: InsightsActions;
}) {
  if (skills.length === 0) return null;

  return (
    <SidebarSection
      id="skills"
      icon="magic_button"
      title="Skills"
      count={skills.reduce((s, t) => s + t.count, 0)}
    >
      <div className="flex flex-wrap gap-1.5">
        {skills.map(({ name, count, messageUuid }) => (
          <button
            key={name}
            type="button"
            onClick={() => actions.onEntity({ query: name, messageUuid })}
            className="flex items-center gap-1 rounded-full bg-tertiary-container px-1.5 py-0.5 font-mono text-[10px] text-tertiary-container-fg transition hover:brightness-95"
          >
            <span className="material-symbols-outlined text-[12px]">magic_button</span>/{name}
            {count > 1 && <span className="opacity-70">{count}</span>}
          </button>
        ))}
      </div>
    </SidebarSection>
  );
}
