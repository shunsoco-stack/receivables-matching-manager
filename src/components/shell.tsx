"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navigation = [
  ["/", "消込作業台", "01"],
  ["/invoices", "請求一覧", "02"],
  ["/aging", "売掛エイジング", "03"],
  ["/schedule", "入金予定", "04"],
  ["/about", "このデモについて", "05"],
];

export function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  return (
    <>
      <header className="header">
        <Link className="brand" href="/">
          <span className="brand-icon" aria-hidden="true">
            ≋
          </span>
          <span>
            売掛・入金消込
            <span className="brand-sub">MANAGER / 経理の作業台</span>
          </span>
        </Link>
        <span className="demo-pill">● ローカルデモ</span>
      </header>
      <nav className="nav" aria-label="メインナビゲーション">
        {navigation.map(([href, label, number]) => {
          const active = href === "/" ? path === href : path.startsWith(href);
          return (
            <Link href={href} key={href} aria-current={active ? "page" : undefined}>
              <span className="nav-number">{number}</span>
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="main-wrap">{children}</div>
      <footer>
        デモ用の架空データです
        <span>ブラウザ内に保存 · 外部通信なし</span>
      </footer>
    </>
  );
}
