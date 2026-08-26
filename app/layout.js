export const metadata = {
  title: "English-Study",
  description: "Học tiếng Anh giao tiếp cùng AI",
};

export default function RootLayout({ children }) {
  return (
    <html lang="vi">
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}
