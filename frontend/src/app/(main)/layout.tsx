import Sidebar from "@/components/Sidebar";

export default function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-screen bg-(--background)">
      <Sidebar />
      <main className="flex-1 md:ml-64 relative min-h-screen overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}
