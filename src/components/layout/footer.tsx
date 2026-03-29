import Link from "next/link";

export function Footer() {
  return (
    <footer className="bg-slate-800 text-slate-300 mt-16">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xl">🦊</span>
              <span className="font-bold text-white text-lg">FoxPoker</span>
            </div>
            <p className="text-sm leading-relaxed">
              全国のアミューズメントポーカー店舗情報を横断検索できるポータルサイト。
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-white mb-3">店舗を探す</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/search" className="hover:text-white transition-colors">店舗検索</Link></li>
              <li><Link href="/area" className="hover:text-white transition-colors">エリア別</Link></li>
              <li><Link href="/ranking" className="hover:text-white transition-colors">人気ランキング</Link></li>
              <li><Link href="/tournament" className="hover:text-white transition-colors">トーナメント</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-white mb-3">店舗オーナー様へ</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/store-owner" className="hover:text-white transition-colors">掲載案内</Link></li>
              <li><Link href="/store-admin/apply" className="hover:text-white transition-colors">掲載申請</Link></li>
              <li><Link href="/store-admin" className="hover:text-white transition-colors">店舗管理ログイン</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-white mb-3">サービス情報</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/about" className="hover:text-white transition-colors">FoxPokerとは</Link></li>
              <li><Link href="/contact" className="hover:text-white transition-colors">お問い合わせ</Link></li>
              <li><Link href="/legal/terms" className="hover:text-white transition-colors">利用規約</Link></li>
              <li><Link href="/legal/privacy" className="hover:text-white transition-colors">プライバシーポリシー</Link></li>
              <li><Link href="/legal/specified" className="hover:text-white transition-colors">特定商取引法表記</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-700 pt-6 flex flex-col md:flex-row justify-between items-center gap-3 text-sm">
          <p className="text-slate-400">
            ※ 本サービスはアミューズメントポーカー店舗の情報提供を目的としており、賭博・賭けを推奨するものではありません。
          </p>
          <p className="text-slate-500 flex-shrink-0">© 2026 FoxPoker</p>
        </div>
      </div>
    </footer>
  );
}
