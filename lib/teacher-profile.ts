/** 机构统一的老师简历模板。冒号后面留空的项，家长端不显示。 */
export const TEACHER_PROFILE_TEMPLATE = `【XX大学X老师】
📌 基本信息
▪ 姓名：
▪ 性别：
▪ 院校：
▪ 专业：
▪ 年龄：
▪ 年级：
▪ 高考省市：
▪ 现在住址：
🏆 资质背景
▪ 高考成绩：
▪ 各科成绩：
▪ 大学成绩排名/奖项：
▪ 学科能力/证书：
▪ 爱好特长：
📚 辅导范围
▪ 可辅导年级：
▪ 辅导科目：
▪ 授课形式：线上/线下/线上线下均可
▪ 线下覆盖区域：
⏰ 授课安排
▪ 可授课时间区间：
▪ 可授课时段：周中晚上、周末白天/晚上、寒暑假/节假日集中授课
▪ 补充说明：
▪ 上课频率：默认2小时/次，每周 次，可协商调整
▪ 试课安排：可提供 分钟试课，最快 天内安排
💡 教学适配
▪ 适配学生类型：成绩优异拔尖型 / 成绩中游提升型 / 缺乏动力引导型
▪ 教学风格：
▪ 备注：可根据通勤距离、辅导难度微调
📝 辅导经历（可续写）
▪ 1. 时间：
▪ 辅导对象：
▪ 辅导内容：
▪ 教学成果：
▪ 2. 时间：
▪ 辅导对象：
▪ 辅导内容：
▪ 教学成果：
✨ 补充说明：`;

export type ProfileItem = { label: string; value: string };

/** 编号的一组条目，例如"1. 时间 / 辅导对象 / 辅导内容 / 教学成果"；没有编号的条目 index 为 null。 */
export type ProfileGroup = { index: string | null; items: ProfileItem[] };

export type ProfileSection = { title: string; text: string; groups: ProfileGroup[] };

export type TeacherProfile = { title: string; sections: ProfileSection[] };

const TITLE = /^【(.+)】$/;
const HEADING = /^\p{Extended_Pictographic}\uFE0F?\s*([^：:]+?)\s*(?:[:：]\s*(.*))?$/u;
const BULLET = /^[▪•·●◦\-*]\s*/;
const ITEM = /^([^：:]{1,20}?)\s*[:：]\s*(.*)$/;
const NUMBERED = /^(\d+)[.、．]\s*(.+)$/;
const TEMPLATE_HINT = /[（(]可续写[)）]$/;

/** 按模板的写法解析：【标题】、表情开头的小节、"▪ 标签：内容"的条目；其他行接在上一条后面。 */
export function parseTeacherProfile(raw: string): TeacherProfile {
  const profile: TeacherProfile = { title: "", sections: [] };
  let section: ProfileSection | null = null;
  let group: ProfileGroup | null = null;
  let lastItem: ProfileItem | null = null;

  const currentSection = (): ProfileSection => {
    if (!section) {
      section = { title: "", text: "", groups: [] };
      profile.sections.push(section);
    }
    return section;
  };
  const currentGroup = (): ProfileGroup => {
    if (!group) {
      group = { index: null, items: [] };
      currentSection().groups.push(group);
    }
    return group;
  };

  for (const original of raw.replace(/\r\n?/g, "\n").split("\n")) {
    const line = original.trim();
    if (!line) continue;

    const title = TITLE.exec(line);
    if (title && !profile.title && profile.sections.length === 0) {
      profile.title = title[1].trim();
      continue;
    }

    // 先认条目："▪" 本身也算表情字符，放在小节判断后面会被当成小节标题
    if (BULLET.test(line)) {
      const content = line.replace(BULLET, "");
      const item = ITEM.exec(content);
      const label = item ? item[1].trim() : "";
      const value = item ? item[2].trim() : content;
      const numbered = NUMBERED.exec(label);
      if (numbered) {
        group = { index: numbered[1], items: [] };
        currentSection().groups.push(group);
        lastItem = { label: numbered[2].trim(), value };
      } else {
        lastItem = { label, value };
      }
      currentGroup().items.push(lastItem);
      continue;
    }

    const heading = HEADING.exec(line);
    if (heading) {
      section = { title: heading[1].replace(TEMPLATE_HINT, "").trim(), text: (heading[2] ?? "").trim(), groups: [] };
      profile.sections.push(section);
      group = null;
      lastItem = null;
      continue;
    }

    if (lastItem) {
      lastItem.value = lastItem.value ? `${lastItem.value}\n${line}` : line;
    } else {
      const target = currentSection();
      target.text = target.text ? `${target.text}\n${line}` : line;
    }
  }
  return profile;
}

/** 去掉没填的条目、空的组和空的小节，只留家长需要看的内容。 */
export function visibleProfile(profile: TeacherProfile): TeacherProfile {
  const sections = profile.sections
    .map((section) => ({
      ...section,
      groups: section.groups
        .map((group) => ({ ...group, items: group.items.filter((item) => item.value) }))
        .filter((group) => group.items.length > 0),
    }))
    .filter((section) => section.text || section.groups.length > 0);
  return { title: profile.title, sections };
}
