export const LANGUAGES = ['en', 'es'] as const
export type Language = (typeof LANGUAGES)[number]

export const LANGUAGE_NAMES: Record<Language, string> = {
  en: 'English',
  es: 'Español',
}

export function isLanguage(value: unknown): value is Language {
  return LANGUAGES.includes(value as Language)
}

const en = {
  'common.loading': 'Loading...',
  'common.email': 'Email',
  'common.password': 'Password',
  'common.backToSignIn': 'Back to sign in',
  'common.backToDashboard': '← Back to dashboard',

  'login.welcomeBack': 'Welcome back',
  'login.createAccount': 'Create account',
  'login.subtitleSignIn': 'Sign in to your tracker',
  'login.subtitleSignUp': 'Start tracking your applications',
  'login.continueWithGoogle': 'Continue with Google',
  'login.or': 'or',
  'login.confirmPassword': 'Confirm password',
  'login.passwordsDoNotMatch': 'Passwords do not match',
  'login.passwordTooShort': 'Password must be at least 6 characters',
  'login.checkEmail': 'Check your email to confirm your account!',
  'login.signIn': 'Sign in',
  'login.signUp': 'Sign up',
  'login.haveAccount': 'Already have an account?',
  'login.noAccount': "Don't have an account?",
  'login.forgotPassword': 'Forgot your password?',

  'forgot.title': 'Reset password',
  'forgot.subtitle': "Enter your email and we'll send you a reset link.",
  'forgot.enterEmail': 'Please enter your email address',
  'forgot.sending': 'Sending...',
  'forgot.send': 'Send reset link',
  'forgot.sentTo': 'Check your inbox — we sent a reset link to {email}.',

  'reset.title': 'Set new password',
  'reset.subtitle': 'Choose a new password for your account.',
  'reset.done': 'Password updated! Redirecting you to the dashboard...',
  'reset.invalidLink': 'Invalid or expired reset link.',
  'reset.requestNew': 'Request a new one.',
  'reset.newPassword': 'New password',
  'reset.confirmNewPassword': 'Confirm new password',
  'reset.updating': 'Updating...',
  'reset.update': 'Update password',

  'dashboard.title': 'My applications',
  'dashboard.total': '{count} total',
  'dashboard.add': '+ Add application',
  'dashboard.settings': 'Settings',
  'dashboard.signOut': 'Sign out',
  'dashboard.empty': 'No applications yet.',
  'dashboard.addFirst': 'Add your first one →',
  'dashboard.viewListing': 'View listing ↗',
  'dashboard.delete': 'Delete',
  'dashboard.daysLeft': '({count} days)',

  'status.applied': 'Applied',
  'status.interview': 'Interview',
  'status.offer': 'Offer',
  'status.rejected': 'Rejected',

  'upload.title': 'Add a job application',
  'upload.preview': 'Screenshot preview',
  'upload.extracting': 'Extracting...',
  'upload.extract': 'Extract job details',
  'upload.noScreenshot': 'No screenshot?',
  'upload.enterManually': 'Enter the details yourself',
  'upload.confirmDetails': 'Confirm details',
  'upload.jobDetails': 'Job details',
  'upload.saving': 'Saving...',
  'upload.save': 'Save to tracker',
  'upload.useScreenshot': 'Use a screenshot instead',
  'upload.goToSettings': 'Go to Settings →',
  'upload.requiredFields': 'Company and title are required.',

  'field.company': 'Company',
  'field.title': 'Title',
  'field.deadline': 'Deadline',
  'field.pay': 'Pay',
  'field.location': 'Location',
  'field.url': 'URL',
  'field.job_type': 'Job type',

  'settings.title': 'Settings',
  'settings.saved': 'Saved',
  'settings.save': 'Save changes',
  'settings.saving': 'Saving...',

  'settings.keyHeading': 'Gemini API key',
  'settings.keyHelp':
    'Used to extract job details from screenshots, and billed to your own free-tier quota. Without one you can still add applications manually.',
  'settings.keyGet': 'Get a free key at',

  'settings.remindersHeading': 'Deadline reminders',
  'settings.remindersEnabled': 'Email me about upcoming deadlines',
  'settings.reminderDays': 'Days of notice',
  'settings.reminderDaysHelp': 'How far ahead of a deadline to send the reminder (1–30).',

  'settings.newApplicationsHeading': 'New applications',
  'settings.defaultStatus': 'Starting status',
  'settings.defaultStatusHelp': 'What a newly added application is marked as.',

  'settings.languageHeading': 'Language',
  'settings.languageHelp': 'Applies to the app and your reminder emails.',

  'settings.accountHeading': 'Account',
  'settings.signedInAs': 'Signed in as',
  'settings.changePassword': 'Change password',
  'settings.signOut': 'Sign out',

  'email.subject': '{count} application deadlines coming up!',
  'email.subjectOne': '1 application deadline coming up!',
  'email.heading': 'Upcoming deadlines',
  'email.intro': 'You have {count} applications with deadlines in the next {days} days.',
  'email.introOne': 'You have 1 application with a deadline in the next {days} days.',
  'email.company': 'COMPANY',
  'email.role': 'ROLE',
  'email.deadline': 'DEADLINE',
  'email.status': 'STATUS',
  'email.viewDashboard': 'View dashboard →',
}

export type TranslationKey = keyof typeof en

const es: Record<TranslationKey, string> = {
  'common.loading': 'Cargando...',
  'common.email': 'Correo electrónico',
  'common.password': 'Contraseña',
  'common.backToSignIn': 'Volver a iniciar sesión',
  'common.backToDashboard': '← Volver al panel',

  'login.welcomeBack': 'Bienvenido de nuevo',
  'login.createAccount': 'Crear cuenta',
  'login.subtitleSignIn': 'Inicia sesión en tu registro',
  'login.subtitleSignUp': 'Empieza a registrar tus solicitudes',
  'login.continueWithGoogle': 'Continuar con Google',
  'login.or': 'o',
  'login.confirmPassword': 'Confirmar contraseña',
  'login.passwordsDoNotMatch': 'Las contraseñas no coinciden',
  'login.passwordTooShort': 'La contraseña debe tener al menos 6 caracteres',
  'login.checkEmail': '¡Revisa tu correo para confirmar tu cuenta!',
  'login.signIn': 'Iniciar sesión',
  'login.signUp': 'Regístrate',
  'login.haveAccount': '¿Ya tienes una cuenta?',
  'login.noAccount': '¿No tienes una cuenta?',
  'login.forgotPassword': '¿Olvidaste tu contraseña?',

  'forgot.title': 'Restablecer contraseña',
  'forgot.subtitle': 'Ingresa tu correo y te enviaremos un enlace para restablecerla.',
  'forgot.enterEmail': 'Por favor ingresa tu correo electrónico',
  'forgot.sending': 'Enviando...',
  'forgot.send': 'Enviar enlace',
  'forgot.sentTo': 'Revisa tu bandeja de entrada — enviamos un enlace a {email}.',

  'reset.title': 'Establecer nueva contraseña',
  'reset.subtitle': 'Elige una nueva contraseña para tu cuenta.',
  'reset.done': '¡Contraseña actualizada! Redirigiéndote al panel...',
  'reset.invalidLink': 'Enlace inválido o expirado.',
  'reset.requestNew': 'Solicita uno nuevo.',
  'reset.newPassword': 'Nueva contraseña',
  'reset.confirmNewPassword': 'Confirmar nueva contraseña',
  'reset.updating': 'Actualizando...',
  'reset.update': 'Actualizar contraseña',

  'dashboard.title': 'Mis solicitudes',
  'dashboard.total': '{count} en total',
  'dashboard.add': '+ Agregar solicitud',
  'dashboard.settings': 'Configuración',
  'dashboard.signOut': 'Cerrar sesión',
  'dashboard.empty': 'Aún no tienes solicitudes.',
  'dashboard.addFirst': 'Agrega la primera →',
  'dashboard.viewListing': 'Ver oferta ↗',
  'dashboard.delete': 'Eliminar',
  'dashboard.daysLeft': '({count} días)',

  'status.applied': 'Enviada',
  'status.interview': 'Entrevista',
  'status.offer': 'Oferta',
  'status.rejected': 'Rechazada',

  'upload.title': 'Agregar una solicitud',
  'upload.preview': 'Vista previa de la captura',
  'upload.extracting': 'Extrayendo...',
  'upload.extract': 'Extraer datos de la oferta',
  'upload.noScreenshot': '¿No tienes captura?',
  'upload.enterManually': 'Ingresa los datos tú mismo',
  'upload.confirmDetails': 'Confirmar datos',
  'upload.jobDetails': 'Datos de la oferta',
  'upload.saving': 'Guardando...',
  'upload.save': 'Guardar solicitud',
  'upload.useScreenshot': 'Usar una captura en su lugar',
  'upload.goToSettings': 'Ir a Configuración →',
  'upload.requiredFields': 'La empresa y el puesto son obligatorios.',

  'field.company': 'Empresa',
  'field.title': 'Puesto',
  'field.deadline': 'Fecha límite',
  'field.pay': 'Salario',
  'field.location': 'Ubicación',
  'field.url': 'Enlace',
  'field.job_type': 'Tipo de empleo',

  'settings.title': 'Configuración',
  'settings.saved': 'Guardado',
  'settings.save': 'Guardar cambios',
  'settings.saving': 'Guardando...',

  'settings.keyHeading': 'Clave de API de Gemini',
  'settings.keyHelp':
    'Se usa para extraer datos de las capturas, y se cobra a tu propia cuota gratuita. Sin ella puedes seguir agregando solicitudes manualmente.',
  'settings.keyGet': 'Consigue una clave gratis en',

  'settings.remindersHeading': 'Recordatorios de fechas límite',
  'settings.remindersEnabled': 'Enviarme correos sobre fechas límite próximas',
  'settings.reminderDays': 'Días de anticipación',
  'settings.reminderDaysHelp': 'Con cuánta anticipación enviar el recordatorio (1–30).',

  'settings.newApplicationsHeading': 'Solicitudes nuevas',
  'settings.defaultStatus': 'Estado inicial',
  'settings.defaultStatusHelp': 'Con qué estado se marca una solicitud recién agregada.',

  'settings.languageHeading': 'Idioma',
  'settings.languageHelp': 'Se aplica a la aplicación y a tus correos de recordatorio.',

  'settings.accountHeading': 'Cuenta',
  'settings.signedInAs': 'Sesión iniciada como',
  'settings.changePassword': 'Cambiar contraseña',
  'settings.signOut': 'Cerrar sesión',

  'email.subject': '¡{count} fechas límite de solicitudes se acercan!',
  'email.subjectOne': '¡Se acerca la fecha límite de 1 solicitud!',
  'email.heading': 'Fechas límite próximas',
  'email.intro': 'Tienes {count} solicitudes con fechas límite en los próximos {days} días.',
  'email.introOne': 'Tienes 1 solicitud con fecha límite en los próximos {days} días.',
  'email.company': 'EMPRESA',
  'email.role': 'PUESTO',
  'email.deadline': 'FECHA LÍMITE',
  'email.status': 'ESTADO',
  'email.viewDashboard': 'Ver panel →',
}

const dictionaries: Record<Language, Record<TranslationKey, string>> = { en, es }

export function translate(
  language: Language,
  key: TranslationKey,
  params?: Record<string, string | number>
) {
  const template = dictionaries[language][key]
  if (!params) return template
  return Object.entries(params).reduce(
    (text, [name, value]) => text.replaceAll(`{${name}}`, String(value)),
    template
  )
}
