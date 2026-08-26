export const metadata = {
  title: "Hộ Chiếu Tiếng Anh",
  description: "Học tiếng Anh giao tiếp cùng AI",
};

export default function RootLayout({ children }) {
  return (
    <html lang="vi">
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}
