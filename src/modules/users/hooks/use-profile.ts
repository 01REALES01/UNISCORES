"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useAuth } from "@/shared/hooks/useAuth";

export function useProfile() {
    const { user, profile, refreshProfile } = useAuth();
    const [updating, setUpdating] = useState(false);
    const [uploading, setUploading] = useState(false);

    const updateProfile = async (updates: Partial<Record<string, unknown>>): Promise<boolean> => {
        if (!user) return false;
        setUpdating(true);

        try {
            if (typeof updates.full_name === 'string') {
                updates.full_name = updates.full_name.trim().substring(0, 50).replace(/[<>]/g, "");
            }
            if (typeof updates.tagline === 'string') {
                updates.tagline = updates.tagline.trim().substring(0, 100).replace(/<[^>]*>?/gm, '');
            }
            if (typeof updates.about_me === 'string') {
                updates.about_me = updates.about_me.trim().substring(0, 2000).replace(/<[^>]*>?/gm, '');
            }

            const { error: profileError } = await supabase
                .from('profiles')
                .update(updates)
                .eq('id', user.id);

            if (profileError) throw profileError;

            await refreshProfile();
            toast.success("Perfil actualizado correctamente");
            return true;
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            console.error("Error updating profile:", error);
            toast.error("Error al actualizar perfil: " + message);
            return false;
        } finally {
            setUpdating(false);
        }
    };

    const uploadAvatar = async (file: File): Promise<string | undefined> => {
        if (!user) return;
        setUploading(true);

        try {
            const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
            if (!allowedTypes.includes(file.type)) {
                throw new Error("Formato no soportado. Usa JPG, PNG o WebP.");
            }
            if (file.size > 2 * 1024 * 1024) {
                throw new Error("La imagen es demasiado grande (máximo 2MB)");
            }

            const fileExt = file.name.split('.').pop();
            const filePath = `${user.id}/${Date.now()}.${fileExt}`;

            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file, { upsert: true, cacheControl: '3600' });

            if (uploadError) {
                if (uploadError.message.includes('bucket not found')) {
                    throw new Error("El sistema de almacenamiento no está listo. Contacta al admin para crear el bucket 'avatars'.");
                }
                throw uploadError;
            }

            const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);

            await updateProfile({ avatar_url: publicUrl });
            return publicUrl;
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            console.error("Error uploading avatar:", error);
            toast.error("Error al subir imagen: " + message);
        } finally {
            setUploading(false);
        }
    };

    return { updating, uploading, updateProfile, uploadAvatar, profile };
}
