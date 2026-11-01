import type { Icon } from '@phosphor-icons/react';
import { BehanceLogoIcon, DiscordLogoIcon, DribbbleLogoIcon, EnvelopeSimpleIcon, FacebookLogoIcon, GithubLogoIcon, GlobeIcon, InstagramLogoIcon, LinkedinLogoIcon, MediumLogoIcon, PinterestLogoIcon, RedditLogoIcon, SnapchatLogoIcon, SoundcloudLogoIcon, SpotifyLogoIcon, TelegramLogoIcon, ThreadsLogoIcon, TiktokLogoIcon, TwitchLogoIcon, WhatsappLogoIcon, XLogoIcon, YoutubeLogoIcon } from '@phosphor-icons/react';

export interface SocialNetwork { id: string; label: string; icon: Icon; placeholder: string }

/** The networks a page can show as icons under the title. */
export const socialNetworks: SocialNetwork[] = [
  { id: 'instagram', label: 'Instagram', icon: InstagramLogoIcon, placeholder: 'https://instagram.com/you' },
  { id: 'tiktok', label: 'TikTok', icon: TiktokLogoIcon, placeholder: 'https://tiktok.com/@you' },
  { id: 'youtube', label: 'YouTube', icon: YoutubeLogoIcon, placeholder: 'https://youtube.com/@you' },
  { id: 'x', label: 'X', icon: XLogoIcon, placeholder: 'https://x.com/you' },
  { id: 'threads', label: 'Threads', icon: ThreadsLogoIcon, placeholder: 'https://threads.net/@you' },
  { id: 'facebook', label: 'Facebook', icon: FacebookLogoIcon, placeholder: 'https://facebook.com/you' },
  { id: 'linkedin', label: 'LinkedIn', icon: LinkedinLogoIcon, placeholder: 'https://linkedin.com/in/you' },
  { id: 'github', label: 'GitHub', icon: GithubLogoIcon, placeholder: 'https://github.com/you' },
  { id: 'spotify', label: 'Spotify', icon: SpotifyLogoIcon, placeholder: 'https://open.spotify.com/artist/…' },
  { id: 'soundcloud', label: 'SoundCloud', icon: SoundcloudLogoIcon, placeholder: 'https://soundcloud.com/you' },
  { id: 'twitch', label: 'Twitch', icon: TwitchLogoIcon, placeholder: 'https://twitch.tv/you' },
  { id: 'discord', label: 'Discord', icon: DiscordLogoIcon, placeholder: 'https://discord.gg/…' },
  { id: 'pinterest', label: 'Pinterest', icon: PinterestLogoIcon, placeholder: 'https://pinterest.com/you' },
  { id: 'snapchat', label: 'Snapchat', icon: SnapchatLogoIcon, placeholder: 'https://snapchat.com/add/you' },
  { id: 'reddit', label: 'Reddit', icon: RedditLogoIcon, placeholder: 'https://reddit.com/u/you' },
  { id: 'whatsapp', label: 'WhatsApp', icon: WhatsappLogoIcon, placeholder: 'https://wa.me/1234567890' },
  { id: 'telegram', label: 'Telegram', icon: TelegramLogoIcon, placeholder: 'https://t.me/you' },
  { id: 'behance', label: 'Behance', icon: BehanceLogoIcon, placeholder: 'https://behance.net/you' },
  { id: 'dribbble', label: 'Dribbble', icon: DribbbleLogoIcon, placeholder: 'https://dribbble.com/you' },
  { id: 'medium', label: 'Medium', icon: MediumLogoIcon, placeholder: 'https://medium.com/@you' },
  { id: 'email', label: 'Email', icon: EnvelopeSimpleIcon, placeholder: 'mailto:you@domain.com' },
  { id: 'website', label: 'Website', icon: GlobeIcon, placeholder: 'https://yourdomain.com' },
];
export const networkById = (id: string) => socialNetworks.find((n) => n.id === id) ?? socialNetworks[socialNetworks.length - 1]!;
