import { cn } from "cn";
import type { ProfileItem, TeacherProfile } from "@/lib/teacher-profile";

function Rows({ items, className }: { items: ProfileItem[]; className?: string }) {
  return (
    <dl
      className={cn(
        "grid grid-cols-[6.5rem_minmax(0,1fr)] gap-x-4 gap-y-2.5 sm:grid-cols-[8.5rem_minmax(0,1fr)]",
        className,
      )}
    >
      {items.map((item, index) => (
        <div key={index} className="contents">
          <dt className="text-ink-3">{item.label}</dt>
          <dd className="break-words whitespace-pre-line text-ink">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** 老师简历：按模板的小节排版，表情符号只留在原文里方便转发到微信。 */
export function TeacherProfileView({ profile }: { profile: TeacherProfile }) {
  return (
    <article className="max-w-3xl">
      {profile.title ? <h2 className="text-xl font-semibold text-ink">{profile.title}</h2> : null}
      <div className="mt-6 space-y-8">
        {profile.sections.map((section, sectionIndex) => (
          <section key={sectionIndex} className="border-t border-rule pt-5 first:border-t-0 first:pt-0">
            {section.title ? <h3 className="font-semibold text-ink">{section.title}</h3> : null}
            {section.text ? <p className="mt-2 whitespace-pre-line text-ink">{section.text}</p> : null}
            <div className="mt-3 space-y-3">
              {section.groups.map((group, groupIndex) =>
                group.index ? (
                  <div key={groupIndex} className="flex gap-3 rounded-lg border border-rule bg-surface px-4 py-3">
                    <span className="tabular mt-0.5 text-sm font-medium text-ink-3">{group.index}</span>
                    <Rows items={group.items} className="min-w-0 flex-1" />
                  </div>
                ) : (
                  <Rows key={groupIndex} items={group.items} />
                ),
              )}
            </div>
          </section>
        ))}
      </div>
    </article>
  );
}
