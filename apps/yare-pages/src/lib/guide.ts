import websiteGuide from '../../skills/website/SKILL.md?raw';
import { downloadText } from '../yare';

/** The guide without its front matter, ready to hand to an assistant. */
export const guideText = websiteGuide.replace(/^---[\s\S]*?---\n+/, '');
export const guideFileName = 'yare-pages-website-agent-guide.md';
export const downloadGuide = () => downloadText(guideFileName, guideText);

/** What to say to the assistant once it has the guide. */
export const guidePrompt = 'Follow this guide and help me build my website. Ask me what you need, one step at a time.';

/** The steps of building a website, as the guide walks them. The person ticks them off on the site's page. */
export const buildSteps: Array<{ id: string; title: string; detail: string }> = [
  { id: 'accounts', title: 'Create your accounts', detail: 'GitHub for the code, Cloudflare for the hosting. The free plans are enough.' },
  { id: 'guide', title: 'Hand the guide to your assistant', detail: 'Download it, attach the file, and say the sentence below.' },
  { id: 'brief', title: 'Tell it what you are building', detail: 'New site or a replacement, who it is for, what visitors should do. Share your text, pictures and logo.' },
  { id: 'design', title: 'Approve the first page', detail: 'Your assistant builds the home page in working code. Review it on phone and desktop before the rest.' },
  { id: 'pages', title: 'Build the remaining pages', detail: 'Same design, every page and link working.' },
  { id: 'github', title: 'Keep the code in your GitHub', detail: 'Your assistant saves the project in a repository of yours.' },
  { id: 'deploy', title: 'Deploy to your Cloudflare', detail: 'A preview address first; check it before the domain.' },
  { id: 'domain', title: 'Connect your domain', detail: 'Then paste the final address here and the visitors show up.' },
];
