import Link from 'next/link';
import { useAuth } from '@lib/context/auth-context';
import { useWindow } from '@lib/context/window-context';
import { useModal } from '@lib/hooks/useModal';
import { Modal } from '@components/modal/modal';
import { CustomIcon } from '@components/ui/custom-icon';
import { Button } from '@components/ui/button';
import { YajuterComposer } from '@components/yajuter/yajuter-composer';
import { SidebarLink } from './sidebar-link';
import { SidebarProfile } from './sidebar-profile';
import type { IconName } from '@components/ui/hero-icon';

export type NavLink = {
  href: string;
  linkName: string;
  iconName: IconName;
  disabled?: boolean;
  canBeHidden?: boolean;
};

const navLinks: Readonly<NavLink[]> = [
  {
    href: '/home',
    linkName: 'ホーム',
    iconName: 'HomeIcon'
  },
  {
    href: '/explore',
    linkName: '話題を検索',
    iconName: 'HashtagIcon',
    disabled: true,
    canBeHidden: true
  },
  {
    href: '/notifications',
    linkName: '通知',
    iconName: 'BellIcon',
    disabled: true
  },
  {
    href: '/messages',
    linkName: 'メッセージ',
    iconName: 'EnvelopeIcon',
    disabled: true
  },
  {
    href: '/bookmarks',
    linkName: 'お気に入り',
    iconName: 'BookmarkIcon',
    canBeHidden: true
  },
  {
    href: '/lists',
    linkName: 'リスト',
    iconName: 'Bars3BottomLeftIcon',
    disabled: true,
    canBeHidden: true
  }
];

export function Sidebar(): JSX.Element {
  const { user } = useAuth();
  const { isMobile } = useWindow();

  const { open, openModal, closeModal } = useModal();

  const username = user?.username as string;

  return (
    <header
      id='sidebar'
      className='flex w-0 shrink-0 transition-opacity duration-200 xs:w-20 md:w-24
                 lg:max-w-none xl:-mr-4 xl:w-full xl:max-w-xs xl:justify-end'
    >
      <Modal
        className='flex items-start justify-center'
        modalClassName='bg-main-background rounded-2xl max-w-xl w-full mt-8 overflow-hidden'
        open={open}
        closeModal={closeModal}
      >
        {user && (
          <YajuterComposer
            owner={user}
            onPosted={(): void => {
              closeModal();
              window.location.reload();
            }}
          />
        )}
      </Modal>
      <div
        className='fixed bottom-0 z-10 flex w-full flex-col justify-between border-t border-light-border 
                   bg-main-background py-0 dark:border-dark-border xs:top-0 xs:h-full xs:w-auto xs:border-0 
                   xs:bg-transparent xs:px-2 xs:py-3 xs:pt-2 md:px-4 xl:w-72'
      >
        <section className='flex flex-col justify-center gap-2 xs:items-center xl:items-stretch'>
          <h1 className='hidden xs:flex'>
            <Link href='/home'>
              <a
                className='custom-button main-tab transition hover:bg-light-primary/10
                           focus-visible:bg-accent-yellow/10 focus-visible:!ring-accent-yellow/80
                           dark:hover:bg-dark-primary/10'
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  className='h-8 w-8 rounded-full'
                  src='/images/logo.png'
                  alt='yajuter'
                />
              </a>
            </Link>
          </h1>
          <nav className='flex items-center justify-around xs:flex-col xs:justify-center xl:block'>
            {navLinks.map(({ ...linkData }) => (
              <SidebarLink {...linkData} key={linkData.href} />
            ))}
            {/* TODO: 表示設定モーダルは移植中のため一時的に非表示 */}
            <SidebarLink
              href={`/user/${username}`}
              username={username}
              linkName='プロフィール'
              iconName='UserIcon'
            />
          </nav>
          <Button
            className='accent-tab absolute right-4 -translate-y-[72px] bg-main-accent text-lg font-bold text-white
                       outline-none transition hover:brightness-90 active:brightness-75 xs:static xs:translate-y-0
                       xs:hover:bg-main-accent/90 xs:active:bg-main-accent/75 xl:w-11/12'
            onClick={openModal}
          >
            <CustomIcon
              className='block h-6 w-6 xl:hidden'
              iconName='FeatherIcon'
            />
            <p className='hidden xl:block'>投稿する</p>
          </Button>
        </section>
        {!isMobile && <SidebarProfile />}
      </div>
    </header>
  );
}
