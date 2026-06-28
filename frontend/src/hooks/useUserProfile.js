import { useCallback, useContext, useEffect, useState } from "react";
import AuthContext from "../templates/AuthContext";

const EMPTY_PROFILE = {
  user_id: "",
  name: "",
  email: "",
  phone: "",
  profile_pic: "",
};

export function useUserProfile() {
  const { api, authFetch, updateUser } = useContext(AuthContext);
  const [profile, setProfile] = useState(EMPTY_PROFILE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await authFetch(`${api}/settings/profile`, { method: "POST" });
      const data = await response.json();

      if (data.status === "success" && data.data) {
        setProfile({
          user_id: data.data.user_id || "",
          name: data.data.name || "",
          email: data.data.email || "",
          phone: data.data.phone || "",
          profile_pic: data.data.profile_pic || "",
        });
      } else {
        setError(data.message || "Unable to load profile.");
      }
    } catch {
      setError("Unable to load profile.");
    } finally {
      setLoading(false);
    }
  }, [api, authFetch]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const saveProfile = useCallback(
    async ({ name, email, phone, profilePic, removeProfilePic }) => {
      setSaving(true);
      setError(null);
      setSuccess(null);

      try {
        const fd = new FormData();
        fd.append("name", name);
        fd.append("email", email);
        fd.append("phone", phone);

        if (removeProfilePic) {
          fd.append("profile_pic", "__REMOVE__");
        } else if (profilePic) {
          fd.append("profile_pic", profilePic);
        }

        const response = await authFetch(`${api}/settings/profile/update`, {
          method: "POST",
          body: fd,
        });
        const data = await response.json();

        if (data.status === "success" && data.data) {
          const nextProfile = {
            user_id: data.data.user_id || "",
            name: data.data.name || "",
            email: data.data.email || "",
            phone: data.data.phone || "",
            profile_pic: data.data.profile_pic || "",
          };
          setProfile(nextProfile);
          updateUser({
            name: nextProfile.name,
            email: nextProfile.email,
            profilePic: nextProfile.profile_pic,
          });
          setSuccess("Profile saved.");
          return true;
        }

        setError(data.message || "Unable to save profile.");
        return false;
      } catch {
        setError("Unable to save profile.");
        return false;
      } finally {
        setSaving(false);
      }
    },
    [api, authFetch, updateUser]
  );

  const changePassword = useCallback(
    async ({ currentPassword, newPassword }) => {
      setPasswordSaving(true);
      setError(null);
      setSuccess(null);

      try {
        const fd = new FormData();
        fd.append("current_password", currentPassword);
        fd.append("new_password", newPassword);

        const response = await authFetch(`${api}/settings/profile/password`, {
          method: "POST",
          body: fd,
        });
        const data = await response.json();

        if (data.status === "success") {
          setSuccess("Password updated.");
          return true;
        }

        setError(data.message || "Unable to update password.");
        return false;
      } catch {
        setError("Unable to update password.");
        return false;
      } finally {
        setPasswordSaving(false);
      }
    },
    [api, authFetch]
  );

  return {
    profile,
    loading,
    saving,
    passwordSaving,
    error,
    success,
    setError,
    setSuccess,
    reload: loadProfile,
    saveProfile,
    changePassword,
  };
}
