import { ReactNode } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  LogOut,
  Users,
  BookOpen,
  ClipboardCheck,
  BarChart4,
  Home,
  Settings,
} from "lucide-react";

interface MainLayoutProps {
  children: ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export default function MainLayout({
  children,
  activeTab,
  onTabChange,
}: MainLayoutProps) {
  const { user, logoutMutation } = useAuth();

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const tabs = [
    {
      id: "lop-hoc",
      name: "Lớp học",
      icon: <BookOpen className="h-5 w-5 mr-2" />,
    },
    {
      id: "hoc-sinh",
      name: "Học sinh",
      icon: <Users className="h-5 w-5 mr-2" />,
    },
    {
      id: "diem-danh",
      name: "Điểm danh",
      icon: <ClipboardCheck className="h-5 w-5 mr-2" />,
    },
    {
      id: "thanh-toan",
      name: "Thanh toán",
      icon: <span className="h-5 w-5 mr-2 inline-flex items-center justify-center">💰</span>,
    },
    {
      id: "bao-cao",
      name: "Báo cáo",
      icon: <BarChart4 className="h-5 w-5 mr-2" />,
    },
    {
      id: "cai-dat",
      name: "Cài đặt",
      icon: <Settings className="h-5 w-5 mr-2" />,
    },
  ];

  return (
    <div className="flex min-h-screen bg-neutral-50">
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-white shadow-md border-r border-gray-200">
        <div className="h-16 flex items-center px-6 border-b border-gray-200">
          <Home className="h-6 w-6 text-primary mr-2" />
          <h1 className="text-lg font-bold text-primary">HoeEdu Solution</h1>
        </div>

        <nav className="mt-6">
          <ul className="space-y-1 px-3">
            {tabs.map((tab) => (
              <li key={tab.id}>
                <button
                  className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                    activeTab === tab.id
                      ? "bg-primary/10 text-primary border-l-4 border-primary"
                      : "text-gray-600 hover:bg-gray-100 hover:text-primary"
                  }`}
                  onClick={() => onTabChange(tab.id)}
                >
                  {tab.icon}
                  {tab.name}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {/* User Profile and Logout at top right corner */}
        <div className="flex justify-end items-center p-4 bg-white border-b border-gray-200">
          <div className="flex items-center">
            <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-medium mr-3">
              {user?.username?.charAt(0).toUpperCase()}
            </div>
            <div className="mr-4">
              <p className="text-sm font-medium text-gray-700">
                {user?.username}
              </p>
              <p className="text-xs text-gray-500">Quản trị viên</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="text-gray-700 border-gray-300"
              onClick={handleLogout}
              disabled={logoutMutation.isPending}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Đăng xuất
            </Button>
          </div>
        </div>
        
        <div className="py-6 px-8">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-800">
              {tabs.find((tab) => tab.id === activeTab)?.name || "Dashboard"}
            </h1>
            <p className="text-sm text-gray-500">
              Quản lý hệ thống giáo dục của bạn một cách hiệu quả
            </p>
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
