// src/app/(auth)/layout.js
export default function AuthLayout({ children }) {
    return (
        <div className="auth-container">
            {/* You can add a common wrapper, sidebar, or background here */}
            {children}
        </div>
    );
}
