import { useState, useCallback } from "react";
import i18n from "../i18n";

interface FormErrors {
  email?: string;
  password?: string;
  name?: string;
}

interface FormValues {
  email: string;
  password: string;
  name?: string;
}

interface FormTouched {
  email?: boolean;
  password?: boolean;
  name?: boolean;
}

export const useFormValidation = (initialValues: FormValues, validate: (values: FormValues) => FormErrors) => {
  const [values, setValues] = useState<FormValues>(initialValues);
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<FormTouched>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = useCallback(
    (field: keyof FormValues, value: string) => {
      setValues(prev => ({
        ...prev,
        [field]: value
      }));
      
      // Clear error for this field when user types
      if (errors[field]) {
        setErrors(prev => ({
          ...prev,
          [field]: undefined
        }));
      }
    },
    [errors]
  );

  const handleBlur = useCallback(
    (field: keyof FormValues) => {
      setTouched(prev => ({
        ...prev,
        [field]: true
      }));
      
      // Validate on blur
      const fieldErrors = validate(values);
      if (fieldErrors[field]) {
        setErrors(prev => ({
          ...prev,
          [field]: fieldErrors[field]
        }));
      }
    },
    [values, validate]
  );

  const validateForm = useCallback(() => {
    const formErrors = validate(values);
    setErrors(formErrors);
    
    // Mark all fields as touched to show errors
    setTouched({
      email: true,
      password: true,
      name: true
    });
    
    return Object.keys(formErrors).length === 0;
  }, [values, validate]);

  const resetForm = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
  }, [initialValues]);

  return {
    values,
    errors,
    touched,
    isSubmitting,
    setIsSubmitting,
    handleChange,
    handleBlur,
    validateForm,
    resetForm
  };
};

// Validation functions
export const validateLogin = (values: FormValues): FormErrors => {
  const errors: FormErrors = {};
  
  if (!values.email) {
    errors.email = i18n.t("validation.emailRequired");
  } else if (!/\S+@\S+\.\S+/.test(values.email)) {
    errors.email = i18n.t("validation.emailInvalid");
  }
  
  if (!values.password) {
    errors.password = i18n.t("validation.passwordRequired");
  } else if (values.password.length < 6) {
    errors.password = i18n.t("validation.passwordMinLength", { count: 6 });
  }
  
  return errors;
};

  export const validateRegister = (values: FormValues): FormErrors => {
  const errors: FormErrors = {};

  if (!values.name) {
    errors.name = i18n.t("validation.nameRequired");
  } else if (values.name.trim().length < 2) {
    errors.name = i18n.t("validation.nameMinLength", { count: 2 });
  }

  if (!values.email) {
    errors.email = i18n.t("validation.emailRequired");
  } else if (!/\S+@\S+\.\S+/.test(values.email)) {
    errors.email = i18n.t("validation.emailInvalid");
  }

   if (!values.password) {
    errors.password = i18n.t("validation.passwordRequired");
  } else if (values.password.length < 8) {
    errors.password = i18n.t("validation.passwordMinLength", { count: 8 });
  } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}/.test(values.password)) {
    errors.password = i18n.t("validation.passwordComplexity");
  }

  return errors;
};