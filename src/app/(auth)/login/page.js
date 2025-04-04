import { Suspense } from 'react';
import {LoginForm} from "@/components/auth/login-form";

function LoadingFallback() {
    return <div>Loading...</div>; 
}

export default function AuthLoginPage() {
    return (
        <div>
            <Suspense fallback={<LoadingFallback />}>
            <LoginForm />
            </Suspense>
        </div>
    );
}
