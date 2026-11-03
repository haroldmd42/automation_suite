/**
 * Configuración de Zonas de Carga y Reglas de Validación de Archivos
 * para la Suite de Pruebas Automatizadas QA.
 */

export const FORBIDDEN_CHARS_REGEX = /[\\/:*?"<>|]/;
export const PATH_TRAVERSAL_REGEX = /\.\./;

export const UPLOAD_ZONES = [
  {
    id: 'pdf',
    key: 'pdf',
    badge: 'Zona 01',
    title: 'Documentos Oficiales y Reportes (Solo PDF)',
    description: 'Carga de documentación oficial, manuales y reportes en formato PDF.',
    allowedExtensions: ['.pdf'],
    accept: '.pdf,application/pdf',
    minSizeBytes: 50 * 1024, // 50 KB
    maxSizeBytes: 3 * 1024 * 1024, // 3 MB
    maxFilenameLength: 45,
    disallowSpecialChars: true,
    requiresNoSpaces: false,
    multiple: false,
    rulesSummary: 'Solo archivos .PDF · Tamaño: 50 KB a 3 MB · Nombre máx: 45 caracteres sin caracteres especiales',
  },
  {
    id: 'image',
    key: 'image',
    badge: 'Zona 02',
    title: 'Evidencias Visuales y Capturas (Imágenes)',
    description: 'Carga de evidencias fotográficas, capturas de pantalla y diagramas de pruebas.',
    allowedExtensions: ['.png', '.jpg', '.jpeg', '.webp'],
    accept: '.png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp',
    minSizeBytes: 20 * 1024, // 20 KB
    maxSizeBytes: 4 * 1024 * 1024, // 4 MB
    maxFilenameLength: 40,
    disallowSpecialChars: true,
    requiresNoSpaces: true, // No permite espacios
    multiple: false,
    rulesSummary: 'Formatos: .PNG, .JPG, .JPEG, .WEBP · Tamaño: 20 KB a 4 MB · Nombre máx: 40 car. (Sin espacios en blanco)',
  },
  {
    id: 'data',
    key: 'data',
    badge: 'Zona 03',
    title: 'Planillas Financieras y Datasets (Excel / CSV)',
    description: 'Carga de matrices tabulares, balances y datasets para análisis de calidad.',
    allowedExtensions: ['.xlsx', '.csv'],
    accept: '.xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv',
    minSizeBytes: 10 * 1024, // 10 KB
    maxSizeBytes: 8 * 1024 * 1024, // 8 MB
    maxFilenameLength: 50,
    disallowSpecialChars: true,
    requiresNoSpaces: false,
    multiple: false,
    rulesSummary: 'Formatos: .XLSX, .CSV · Tamaño: 10 KB a 8 MB · Nombre máx: 50 caracteres · No archivos vacíos',
  },
  {
    id: 'batch',
    key: 'batch',
    badge: 'Zona 04',
    title: 'Carga Múltiple de Documentación (Lote General)',
    description: 'Carga simultánea de hasta 4 archivos mixtos con validación de peso acumulado.',
    allowedExtensions: ['.pdf', '.docx', '.xlsx', '.png', '.jpg'],
    accept: '.pdf,.docx,.xlsx,.png,.jpg',
    minSizeBytes: 30 * 1024, // 30 KB
    maxSizeBytes: 5 * 1024 * 1024, // 5 MB por archivo
    maxBatchSizeBytes: 12 * 1024 * 1024, // 12 MB total
    maxFilesPerBatch: 4,
    maxFilenameLength: 60,
    disallowSpecialChars: true,
    requiresNoSpaces: false,
    multiple: true,
    rulesSummary: 'Formatos: PDF, DOCX, XLSX, PNG, JPG · Hasta 4 archivos · Máx 5 MB c/u (Lote total: 12 MB)',
  },
];

/**
 * Valida un archivo contra las reglas específicas de la zona correspondiente
 */
export function validateFileForZone(file, zone, existingFiles = []) {
  if (!file) {
    return {
      isValid: false,
      errorKey: 'missing_file',
      errorMessage: 'No se detectó ningún archivo seleccionado.',
      failedRule: 'Archivo requerido',
    };
  }

  const fileName = file.name || '';
  const fileSize = typeof file.size === 'number' ? file.size : 0;
  const ext = fileName.includes('.') ? `.${fileName.split('.').pop().toLowerCase()}` : '';

  // 1. Archivo vacío
  if (fileSize === 0) {
    return {
      isValid: false,
      errorKey: 'empty_file',
      errorMessage: 'El archivo está vacío (0 Bytes). Debe contener datos válidos.',
      failedRule: 'Contenido no vacío',
    };
  }

  // 2. Peso mínimo
  if (zone.minSizeBytes && fileSize < zone.minSizeBytes) {
    return {
      isValid: false,
      errorKey: 'min_size_exceeded',
      errorMessage: `El peso del archivo (${formatFileSize(fileSize)}) es inferior al mínimo requerido de ${formatFileSize(zone.minSizeBytes)}.`,
      failedRule: 'Peso mínimo',
    };
  }

  // 3. Peso máximo por archivo
  if (zone.maxSizeBytes && fileSize > zone.maxSizeBytes) {
    return {
      isValid: false,
      errorKey: 'max_size_exceeded',
      errorMessage: `El peso del archivo (${formatFileSize(fileSize)}) supera el límite máximo permitido de ${formatFileSize(zone.maxSizeBytes)}.`,
      failedRule: 'Peso máximo',
    };
  }

  // 4. Formato / Extensión
  if (zone.allowedExtensions && !zone.allowedExtensions.includes(ext)) {
    return {
      isValid: false,
      errorKey: 'invalid_format',
      errorMessage: `El formato "${ext || 'desconocido'}" no está permitido en esta zona. Formatos aceptados: ${zone.allowedExtensions.map((e) => e.toUpperCase()).join(', ')}.`,
      failedRule: 'Formato y extensión',
    };
  }

  // 5. Espacios en blanco (si la zona lo prohíbe, ej. imágenes)
  if (zone.requiresNoSpaces && /\s/.test(fileName)) {
    return {
      isValid: false,
      errorKey: 'spaces_not_allowed',
      errorMessage: 'El nombre del archivo no debe contener espacios en blanco. Utiliza guiones o guiones bajos.',
      failedRule: 'Espacios en nombre',
    };
  }

  // 6. Longitud del nombre
  if (zone.maxFilenameLength && fileName.length > zone.maxFilenameLength) {
    return {
      isValid: false,
      errorKey: 'filename_length_exceeded',
      errorMessage: `El nombre del archivo tiene ${fileName.length} caracteres y excede el límite máximo de ${zone.maxFilenameLength} caracteres.`,
      failedRule: 'Longitud del nombre',
    };
  }

  // 7. Path Traversal y Caracteres Prohibidos
  if (zone.disallowSpecialChars && (PATH_TRAVERSAL_REGEX.test(fileName) || FORBIDDEN_CHARS_REGEX.test(fileName))) {
    return {
      isValid: false,
      errorKey: 'forbidden_characters',
      errorMessage: 'El nombre contiene caracteres especiales prohibidos o secuencias de path traversal (..).',
      failedRule: 'Nomenclatura segura',
    };
  }

  // 8. Duplicados en la misma zona
  const isDuplicate = existingFiles.some(
    (f) => f.name === fileName && f.size === fileSize && f.zoneId === zone.id
  );
  if (isDuplicate) {
    return {
      isValid: false,
      errorKey: 'duplicate_file',
      errorMessage: `Ya existe un archivo procesado con el mismo nombre y tamaño ("${fileName}").`,
      failedRule: 'Archivo duplicado',
    };
  }

  return {
    isValid: true,
    errorKey: null,
    errorMessage: null,
    failedRule: null,
  };
}

/**
 * Formatea bytes a cadena legible (KB / MB)
 */
export function formatFileSize(bytes) {
  if (typeof bytes !== 'number' || isNaN(bytes)) return '0 B';
  if (bytes === 0) return '0 Bytes';
  if (bytes < 1024) return `${bytes} Bytes`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
