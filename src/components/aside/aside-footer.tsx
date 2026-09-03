export function AsideFooter(): JSX.Element {
  return (
    <footer
      className='sticky top-16 flex flex-col gap-3 text-center text-sm
                 text-light-secondary dark:text-dark-secondary'
    >
      <nav className='flex flex-wrap justify-center gap-2'>
        <span>推しかつ記録</span>
        <span>1人用モード</span>
        <span>デジタル巡礼推奨</span>
      </nav>
      <p>© 2026 yajuter（野獣先輩ファンの1人用SNS）</p>
    </footer>
  );
}
