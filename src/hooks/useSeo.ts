import { useEffect } from 'react';

interface SeoProps {
    title: string;
    description?: string;
}

export function useSeo({ title, description }: SeoProps) {
    useEffect(() => {
        const previousTitle = document.title;
        const previousDescription = document.querySelector('meta[name="description"]')?.getAttribute('content');

        // Update Title
        document.title = title;

        // Update Description
        if (description) {
            let metaDescription = document.querySelector('meta[name="description"]');
            if (!metaDescription) {
                metaDescription = document.createElement('meta');
                metaDescription.setAttribute('name', 'description');
                document.head.appendChild(metaDescription);
            }
            metaDescription.setAttribute('content', description);
        }

        // Cleanup on unmount (optional, but good for single-page apps returning to home)
        return () => {
            document.title = previousTitle;
            if (previousDescription) {
                document.querySelector('meta[name="description"]')?.setAttribute('content', previousDescription);
            }
        };
    }, [title, description]);
}
