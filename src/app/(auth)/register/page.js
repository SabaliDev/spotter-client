import { Suspense } from 'react';
import {RegisterForm} from "@/components/auth/register-form";

function LoadingFallback() {
    return <div>Loading...</div>; 
}

export default function AuthRegisterPage() {
    return (
        <div>
            <Suspense fallback={<LoadingFallback />}>
            <RegisterForm />
            </Suspense>
        </div>
    );
}
 