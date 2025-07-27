import { Authenticated, Unauthenticated, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { SignInForm } from "./SignInForm";
import { SignOutButton } from "./SignOutButton";
import { Toaster } from "sonner";
import { ChatApp } from "./components/ChatApp";
import { ProfileSetup } from "./components/ProfileSetup";

export default function App() {
  return (
    <div className="min-h-screen bg-white">
      <Authenticated>
        <AuthenticatedApp />
      </Authenticated>
      <Unauthenticated>
        <div className="min-h-screen flex flex-col bg-gray-50">
          <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm h-16 flex justify-between items-center border-b shadow-sm px-4">
            <h2 className="text-xl font-semibold text-[#00C300]">LINE Chat</h2>
          </header>
          <main className="flex-1 flex items-center justify-center p-8">
            <div className="w-full max-w-md mx-auto">
              <div className="text-center mb-8">
                <h1 className="text-5xl font-bold text-[#00C300] mb-4">LINE Chat</h1>
                <p className="text-xl text-[#80868B]">Sign in to start messaging</p>
              </div>
              <SignInForm />
            </div>
          </main>
        </div>
      </Unauthenticated>
      <Toaster />
    </div>
  );
}

function AuthenticatedApp() {
  const currentUser = useQuery(api.users.getCurrentUser);
  console.log("is deploying too client")

  if (currentUser === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F1F3F4]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00C300]"></div>
      </div>
    );
  }

  if (!currentUser) {
    return <ProfileSetup />;
  }

  return <ChatApp user={currentUser} />;
}
