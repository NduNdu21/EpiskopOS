import NavBar from "./NavBar";

export default function Layout({ children }) {
  return (
    <div className="min-h-screen bg-off-white">
      {children}
      <NavBar />
    </div>
  );
}