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
      icon: (
        <div className="bg-blue-500/20 p-1.5 rounded-lg mr-3">
          <BookOpen className="h-5 w-5 text-blue-500" />
        </div>
      ),
    },
    {
      id: "hoc-sinh",
      name: "Học sinh",
      icon: (
        <div className="bg-green-500/20 p-1.5 rounded-lg mr-3">
          <Users className="h-5 w-5 text-green-500" />
        </div>
      ),
    },
    {
      id: "diem-danh",
      name: "Điểm danh",
      icon: (
        <div className="bg-yellow-500/20 p-1.5 rounded-lg mr-3">
          <ClipboardCheck className="h-5 w-5 text-yellow-500" />
        </div>
      ),
    },
    {
      id: "thanh-toan",
      name: "Thanh toán",
      icon: (
        <div className="bg-purple-500/20 p-1.5 rounded-lg mr-3">
          <span className="h-5 w-5 inline-flex items-center justify-center text-purple-500">💰</span>
        </div>
      ),
    },
    {
      id: "bao-cao",
      name: "Báo cáo",
      icon: (
        <div className="bg-red-500/20 p-1.5 rounded-lg mr-3">
          <BarChart4 className="h-5 w-5 text-red-500" />
        </div>
      ),
    },
    {
      id: "cai-dat",
      name: "Cài đặt",
      icon: (
        <div className="bg-indigo-500/20 p-1.5 rounded-lg mr-3">
          <Settings className="h-5 w-5 text-indigo-500" />
        </div>
      ),
    },
  ];

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-gradient-to-b from-indigo-700 to-purple-800 shadow-xl">
        <div className="h-20 flex items-center px-6 border-b border-indigo-600/30">
          <div className="bg-white/20 p-2 rounded-lg mr-3">
            <Home className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-indigo-200">
            HoeEdu Solution
          </h1>
        </div>

        <nav className="mt-8">
          <ul className="space-y-2 px-4">
            {tabs.map((tab) => (
              <li key={tab.id}>
                <button
                  className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-300 ${
                    activeTab === tab.id
                      ? "bg-gradient-to-r from-white/20 to-transparent text-white shadow-lg backdrop-blur-sm border-l-4 border-white"
                      : "text-indigo-100 hover:bg-white/10 hover:text-white"
                  }`}
                  onClick={() => onTabChange(tab.id)}
                >
                  {activeTab === tab.id ? (
                    // Sáng hơn khi được chọn
                    <div className="scale-110 transform transition-transform duration-300">
                      {tab.icon}
                    </div>
                  ) : (
                    // Mờ hơn khi không được chọn  
                    <div className="opacity-70">
                      {tab.icon}
                    </div>
                  )}
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
        <div className="flex justify-end items-center py-3 px-6 bg-gradient-to-r from-white to-indigo-50 shadow-sm sticky top-0 z-10 border-b border-indigo-100">
          <div className="flex items-center">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-medium shadow-md mr-3 border-2 border-white hover-scale">
              {user?.username?.charAt(0).toUpperCase()}
            </div>
            <div className="mr-4">
              <p className="text-sm font-medium text-gray-800">
                {user?.username}
              </p>
              <p className="text-xs gradient-heading font-semibold">Quản trị viên</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="glow-button bg-gradient-to-r from-indigo-500 to-purple-600 text-white border-none hover:shadow-lg transition-all duration-300"
              onClick={handleLogout}
              disabled={logoutMutation.isPending}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Đăng xuất
            </Button>
          </div>
        </div>
        
        <div className="py-8 px-10">
          <div className="mb-8 fade-in">
            <div className="flex items-center space-x-2 mb-2">
              <div className="w-2 h-8 bg-gradient-to-b from-indigo-500 to-purple-600 rounded-full"></div>
              <h1 className="text-3xl font-bold gradient-heading">
                {tabs.find((tab) => tab.id === activeTab)?.name || "Dashboard"}
              </h1>
            </div>
            <p className="text-sm text-gray-600 ml-4">
              Quản lý hệ thống giáo dục của bạn một cách hiệu quả
            </p>
          </div>
          <div className="modern-card p-6 fade-in">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
