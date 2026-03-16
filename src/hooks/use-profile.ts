"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useAuth } from "./useAuth";

export function useProfile() {
    const { user, profile, refreshProfile } = useAuth();
    const [updating, setUpdating] = useState(false);
    const [uploading, setUploading] = useState(false);

    const updateProfile = async (updates: Partial<any>): Promise<boolean> => {
        if (!user) return false;
        setUpdating(true);

        try {
            if (updates.full_name) {
                updates.full_name = updates.full_name.trim().substring(0, 50).replace(/[<>]/g, "");
            }
            if (updates.tagline) {
                updates.tagline = updates.tagline.trim().substring(0, 100).replace(/<[^>]*>?/gm, '');
            }
            if (updates.about_me) {
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
        } catch (error: any) {
            console.error("Error updating profile:", error);
            toast.error("Error al actualizar perfil: " + error.message);
            return false;
        } finally {
            setUpdating(false);
        }
    };

    const uploadAvatar = async (file: File) => {
        if (!user) return;
        setUploading(true);

        try {
            // 1. Strict Security Validation
            const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
            if (!allowedTypes.includes(file.type)) {
                throw new Error("Formato no soportado. Usa JPG, PNG o WebP.");
            }

            if (file.size > 2 * 1024 * 1024) {
                throw new Error("La imagen es demasiado grande (máximo 2MB)");
            }

            // 2. Upload to Supabase Storage with structured naming
            const fileExt = file.name.split('.').pop();
            const fileName = `${user.id}/${Date.now()}.${fileExt}`; // Structured by user ID
            const filePath = `${fileName}`;

            // Attempt to create bucket RLS might fail here if bucket doesn't exist
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file, { 
                    upsert: true,
                    cacheControl: '3600'
                });

            if (uploadError) {
                if (uploadError.message.includes('bucket not found')) {
                    throw new Error("El sistema de almacenamiento no está listo. Contacta al admin para crear el bucket 'avatars'.");
                }
                throw uploadError;
            }

            // 3. Get Public URL
            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            // 4. Update Profile with URL
            await updateProfile({ avatar_url: publicUrl });
            
            return publicUrl;
        } catch (error: any) {
            console.error("Error uploading avatar:", error);
            toast.error("Error al subir imagen: " + error.message);
        } finally {
            setUploading(false);
        }
    };

    return {
        updating,
        uploading,
        updateProfile,
        uploadAvatar
    };
}
