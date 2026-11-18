export interface LinkItem {
  label: string;
  url: string;
}

/** 연락처·채널: label(왼쪽 라벨) / text(링크 글자) / url */
export interface ContactItem {
  label: string;
  text: string;
  url: string;
}

export interface AboutItem {
  heading: string;
  /** <b> 굵게 허용 */
  paragraphs: string[];
}

export interface SkillLevel {
  level: string;
  desc: string;
  items: string[];
}

export interface WorkGroup {
  title: string;
  bullets: string[];
}

export interface WorkItem {
  company: string;
  role: string;
  period: string;
  stack: string[];
  groups: WorkGroup[];
}

export interface StackRow {
  label: string;
  items: string[];
}

export interface Detail {
  title: string;
  text: string;
}

export interface Project {
  title: string;
  subtitle: string;
  team: string;
  period: string;
  role: string;
  badge: string;
  /** public/ 기준 상대경로(images/x.jpg) 또는 편집 모드에서 올린 data URL */
  thumbnail: string;
  links: LinkItem[];
  summary: string;
  /** 해결하려던 문제 (<b> 허용) */
  problem: string;
  stack: StackRow[];
  details: Detail[];
  hidden?: boolean;
}

/** 지원동기 버전 (회사별로 하나씩) */
export interface Motivation {
  /** 링크용 영문 id → ?m=<id> */
  id: string;
  /** 지원 회사명 (화면에는 안 보이고 편집·PDF 파일명에 사용) */
  company: string;
  heading: string;
  paragraphs: string[];
}

export interface DatedItem {
  date: string;
  text: string;
}

export type SectionKey = 'about' | 'motivation' | 'skills' | 'work' | 'projects' | 'education';

export interface PortfolioData {
  meta: {
    siteTitle: string;
    pdfFileName: string;
    footer: string;
  };
  hidden: Partial<Record<SectionKey, boolean>>;
  profile: {
    name: string;
    role: string;
    headline: string;
    photo: string;
    contact: ContactItem[];
    channels: ContactItem[];
  };
  about: AboutItem[];
  /** ?m= 없이 접속했을 때 보여줄 지원동기 버전 id */
  defaultMotivation: string;
  motivations: Motivation[];
  skills: SkillLevel[];
  work: WorkItem[];
  projects: Project[];
  education: DatedItem[];
  itEducation: DatedItem[];
  certificates: DatedItem[];
  awards: DatedItem[];
}
