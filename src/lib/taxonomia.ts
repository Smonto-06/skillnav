// Taxonomía de habilidades y roles (HU-24, scoring explicable).
// Resuelve la ambigüedad del texto libre: sinónimos ("Node" = "Node.js" = "NodeJS"),
// equivalencias (quien sabe Next.js sabe React; PostgreSQL implica SQL), habilidades
// afines (MySQL ~ PostgreSQL) y áreas profesionales (un perfil Full Stack cubre
// Backend y Frontend). Todo es determinista y sin dependencias externas.

export type Area =
  | "frontend"
  | "backend"
  | "datos"
  | "cloud"
  | "movil"
  | "qa"
  | "diseno"
  | "gestion";

export const AREA_LABEL: Record<Area, string> = {
  frontend: "Frontend",
  backend: "Backend",
  datos: "Datos",
  cloud: "Cloud / DevOps",
  movil: "Móvil",
  qa: "QA / Pruebas",
  diseno: "Diseño UX/UI",
  gestion: "Gestión ágil",
};

export interface HabilidadCatalogo {
  id: string;
  nombre: string;
  areas: Area[];
  alias: string[];
  /** Habilidades que quedan cubiertas al dominar esta (Next.js -> React). */
  implica: string[];
  /** Habilidades afines con crédito parcial: [id, peso 0-1]. */
  afines: [string, number][];
}

// Clave compacta para comparar texto libre: sin tildes, minúsculas y solo
// letras/números (+ y # se conservan por C++ y C#). "Node.js", "node js" y
// "NodeJS" producen la misma clave "nodejs".
export function clave(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9+#]/g, "");
}

function h(
  id: string,
  nombre: string,
  areas: Area[],
  alias: string[] = [],
  implica: string[] = [],
  afines: [string, number][] = []
): HabilidadCatalogo {
  return { id, nombre, areas, alias, implica, afines };
}

const SQL_AFINES: [string, number][] = [
  ["postgresql", 0.7],
  ["mysql", 0.7],
  ["sqlserver", 0.7],
  ["oracle", 0.7],
];
const sinPropio = (id: string) => SQL_AFINES.filter(([a]) => a !== id);

export const HABILIDADES: HabilidadCatalogo[] = [
  // Frontend
  h("javascript", "JavaScript", ["frontend", "backend"], ["js", "ecmascript", "es6"]),
  h("typescript", "TypeScript", ["frontend", "backend"], ["ts"], ["javascript"]),
  h("html", "HTML", ["frontend"], ["html5"]),
  h("css", "CSS", ["frontend"], ["css3", "sass", "scss"]),
  h("tailwind", "Tailwind CSS", ["frontend"], ["tailwind", "tailwindcss"], ["css"], [["bootstrap", 0.5]]),
  h("bootstrap", "Bootstrap", ["frontend"], [], ["css"], [["tailwind", 0.5]]),
  h("react", "React", ["frontend"], ["reactjs"], ["javascript"], [["vue", 0.5], ["angular", 0.5]]),
  h("nextjs", "Next.js", ["frontend", "backend"], ["next"], ["react", "javascript"]),
  h("angular", "Angular", ["frontend"], ["angularjs"], ["typescript"], [["react", 0.5], ["vue", 0.5]]),
  h("vue", "Vue.js", ["frontend"], ["vuejs"], ["javascript"], [["react", 0.5], ["angular", 0.5]]),
  // Backend
  h("node", "Node.js", ["backend"], ["nodejs"], ["javascript"]),
  h("express", "Express", ["backend"], ["expressjs"], ["node"], [["nestjs", 0.6]]),
  h("nestjs", "NestJS", ["backend"], ["nest"], ["node", "typescript"], [["express", 0.6]]),
  h("python", "Python", ["backend", "datos"]),
  h("django", "Django", ["backend"], [], ["python"], [["flask", 0.6], ["fastapi", 0.6]]),
  h("flask", "Flask", ["backend"], [], ["python"], [["django", 0.6], ["fastapi", 0.6]]),
  h("fastapi", "FastAPI", ["backend"], [], ["python"], [["django", 0.6], ["flask", 0.6]]),
  h("java", "Java", ["backend"], [], [], [["csharp", 0.5], ["kotlin", 0.5]]),
  h("spring", "Spring Boot", ["backend"], ["springboot", "springframework"], ["java"]),
  h("csharp", "C#", ["backend"], ["c#", "csharp"], [], [["java", 0.5]]),
  h("dotnet", ".NET", ["backend"], ["net", "dotnet", "aspnet", "aspnetcore", "netcore"], ["csharp"]),
  h("php", "PHP", ["backend"]),
  h("laravel", "Laravel", ["backend"], [], ["php"]),
  h("go", "Go", ["backend"], ["golang"]),
  h("ruby", "Ruby", ["backend"]),
  h("rails", "Ruby on Rails", ["backend"], ["rubyonrails", "ror"], ["ruby"]),
  h("rest", "APIs REST", ["backend"], ["api", "apis", "apirest", "apisrest", "restful", "restapi", "restapis"]),
  h("graphql", "GraphQL", ["backend", "frontend"], [], [], [["rest", 0.5]]),
  h("microservicios", "Microservicios", ["backend"], ["microservices", "microservicio"], ["rest"]),
  // Bases de datos
  h("sql", "SQL", ["backend", "datos"], ["basesdedatos", "basededatos", "basesdedatosrelacionales"]),
  h("postgresql", "PostgreSQL", ["backend", "datos"], ["postgres", "postgre", "psql"], ["sql"], sinPropio("postgresql")),
  h("mysql", "MySQL", ["backend", "datos"], ["mariadb"], ["sql"], sinPropio("mysql")),
  h("sqlserver", "SQL Server", ["backend", "datos"], ["mssql", "tsql", "microsoftsqlserver"], ["sql"], sinPropio("sqlserver")),
  h("oracle", "Oracle", ["backend", "datos"], ["oracledb", "plsql"], ["sql"], sinPropio("oracle")),
  h("mongodb", "MongoDB", ["backend"], ["mongo", "nosql"], [], [["redis", 0.3]]),
  h("redis", "Redis", ["backend"]),
  // Cloud / DevOps
  h("docker", "Docker", ["cloud", "backend"], ["contenedores", "containers"], [], [["kubernetes", 0.4]]),
  h("kubernetes", "Kubernetes", ["cloud"], ["k8s"], ["docker"]),
  h("aws", "AWS", ["cloud"], ["amazonwebservices"], [], [["azure", 0.5], ["gcp", 0.5]]),
  h("azure", "Azure", ["cloud"], ["microsoftazure"], [], [["aws", 0.5], ["gcp", 0.5]]),
  h("gcp", "Google Cloud", ["cloud"], ["googlecloud", "googlecloudplatform"], [], [["aws", 0.5], ["azure", 0.5]]),
  h("cicd", "CI/CD", ["cloud"], ["ci", "integracioncontinua", "githubactions", "jenkins", "gitlabci"]),
  h("linux", "Linux", ["cloud", "backend"], ["unix", "bash", "shell"]),
  h("git", "Git", ["frontend", "backend"], ["github", "gitlab", "controldeversiones"]),
  // Datos
  h("pandas", "Pandas", ["datos"], [], ["python"]),
  h("numpy", "NumPy", ["datos"], [], ["python"]),
  h("powerbi", "Power BI", ["datos"], [], [], [["tableau", 0.6]]),
  h("tableau", "Tableau", ["datos"], [], [], [["powerbi", 0.6]]),
  h("excel", "Excel", ["datos"], ["excelavanzado", "msexcel"]),
  h("machinelearning", "Machine Learning", ["datos"], ["ml", "aprendizajeautomatico", "inteligenciaartificial", "ia", "ai"]),
  h("estadistica", "Estadística", ["datos"], ["statistics", "estadisticas"]),
  // Móvil
  h("kotlin", "Kotlin", ["movil"], ["android"], [], [["java", 0.5]]),
  h("swift", "Swift", ["movil"], ["ios"]),
  h("flutter", "Flutter", ["movil"], ["dart"], [], [["reactnative", 0.5]]),
  h("reactnative", "React Native", ["movil", "frontend"], [], ["react", "javascript"], [["flutter", 0.5]]),
  // Diseño, QA y gestión
  h("figma", "Figma", ["diseno"]),
  h("uxui", "Diseño UX/UI", ["diseno"], ["ux", "ui", "uxui", "uiux", "disenoux", "experienciadeusuario"]),
  h("testing", "Pruebas de software", ["qa"], ["testing", "qa", "pruebas", "jest", "cypress", "selenium", "pruebasunitarias", "unittesting"]),
  h("scrum", "Scrum", ["gestion"], ["agile", "metodologiasagiles", "metodologiaagil", "kanban"]),
];

const POR_ID = new Map(HABILIDADES.map((s) => [s.id, s]));
const POR_CLAVE = new Map<string, HabilidadCatalogo>();
for (const s of HABILIDADES) {
  for (const a of [s.id, s.nombre, ...s.alias]) POR_CLAVE.set(clave(a), s);
}

export function habilidadPorId(id: string): HabilidadCatalogo | undefined {
  return POR_ID.get(id);
}

// Reconoce una habilidad del catálogo a partir de texto libre ("node js" -> Node.js).
export function resolverHabilidad(texto: string): HabilidadCatalogo | undefined {
  return POR_CLAVE.get(clave(texto));
}

// Habilidades que una habilidad cubre por implicación, incluida ella misma
// (transitivo: Next.js -> React -> JavaScript).
export function cubiertas(id: string): Set<string> {
  const vistas = new Set<string>();
  const pendientes = [id];
  while (pendientes.length) {
    const actual = pendientes.pop()!;
    if (vistas.has(actual)) continue;
    vistas.add(actual);
    pendientes.push(...(POR_ID.get(actual)?.implica ?? []));
  }
  return vistas;
}

/* ---------------- Roles y áreas ---------------- */

interface Rol {
  nombre: string;
  alias: string[];
  areas: Area[];
  /** Roles genéricos ("Desarrollador") cubren sus áreas con menos certeza. */
  generico?: boolean;
}

// Se buscan como subcadena de la clave del texto ("Desarrollador Full Stack Sr."
// contiene "fullstack"), así que los alias deben ser específicos.
const ROLES: Rol[] = [
  { nombre: "Full Stack", alias: ["fullstack"], areas: ["frontend", "backend"] },
  {
    nombre: "Backend",
    alias: ["backend", "backenddeveloper", "desarrolladordeapis", "apideveloper", "desarrolladordeservicios"],
    areas: ["backend"],
  },
  {
    nombre: "Frontend",
    alias: ["frontend", "front", "maquetador", "desarrolladordeinterfaces", "uideveloper"],
    areas: ["frontend"],
  },
  {
    nombre: "Datos",
    alias: [
      "analistadedatos", "cientificodedatos", "ingenierodedatos", "dataanalyst", "datascientist",
      "dataengineer", "businessintelligence", "analistabi", "analiticadedatos", "analisisdedatos",
      "bigdata", "datos", "machinelearning", "mlengineer", "inteligenciaartificial", "analytics",
    ],
    areas: ["datos"],
  },
  {
    nombre: "Bases de datos",
    alias: ["dba", "administradordebasesdedatos", "databaseadministrator", "ingenierodebasesdedatos"],
    areas: ["datos", "backend"],
  },
  {
    nombre: "Cloud / DevOps",
    alias: ["devops", "cloud", "nube", "sre", "infraestructura", "sitereliability", "sysadmin", "administradordesistemas", "platformengineer"],
    areas: ["cloud"],
  },
  { nombre: "Móvil", alias: ["movil", "mobile", "android", "ios", "aplicacionesmoviles", "appsmoviles"], areas: ["movil"] },
  {
    nombre: "QA",
    alias: ["qa", "tester", "calidaddesoftware", "pruebas", "automatizaciondepruebas", "qaautomation", "testing"],
    areas: ["qa"],
  },
  { nombre: "Diseño UX/UI", alias: ["ux", "ui", "disenador", "designer", "disenoux", "disenoui"], areas: ["diseno"] },
  {
    nombre: "Gestión ágil",
    alias: ["scrummaster", "productowner", "projectmanager", "gerentedeproyectos", "productmanager"],
    areas: ["gestion"],
  },
  {
    nombre: "Desarrollo web",
    alias: ["desarrolladorweb", "webdeveloper", "programadorweb", "desarrolloweb"],
    areas: ["frontend", "backend"],
    generico: true,
  },
  {
    nombre: "Desarrollo de software",
    alias: [
      "softwareengineer", "ingenierodesoftware", "desarrolladordesoftware", "developer",
      "desarrollador", "programador", "ingenierodesistemas", "softwaredeveloper", "arquitectodesoftware",
      "techlead", "lidertecnico", "analistaprogramador", "analistadesistemas", "ingenierodedesarrollo",
    ],
    areas: ["frontend", "backend"],
    generico: true,
  },
];

export interface RolDetectado {
  nombre: string;
  areas: Area[];
  generico: boolean;
}

// Detecta los roles mencionados en un cargo o titular. Si hay uno específico
// ("Desarrollador Backend") se descarta el genérico ("Desarrollador").
// Los alias cortos ("ios", "ui", "qa") solo cuentan como palabra completa para
// no confundir "servicios" con iOS; los largos se buscan como subcadena.
export function detectarRoles(texto: string | null | undefined): RolDetectado[] {
  const k = clave(texto ?? "");
  if (!k) return [];
  const palabras = new Set((texto ?? "").split(/[^\p{L}\p{N}+#]+/u).map(clave).filter(Boolean));
  const menciona = (a: string) => (a.length < 5 ? palabras.has(a) : k.includes(a));
  const hallados = ROLES.filter((r) => r.alias.some(menciona)).map((r) => ({
    nombre: r.nombre,
    areas: r.areas,
    generico: !!r.generico,
  }));
  const especificos = hallados.filter((r) => !r.generico);
  return especificos.length ? especificos : hallados;
}

// Áreas mencionadas como requisito genérico ("Backend", "Experiencia en frontend").
export function areasDeRequisito(texto: string): Area[] {
  return Array.from(new Set(detectarRoles(texto).flatMap((r) => r.areas)));
}

// Afinidad entre áreas vecinas (un backend entiende de datos, un frontend de móvil).
const ADYACENCIA: Partial<Record<Area, Partial<Record<Area, number>>>> = {
  backend: { datos: 0.5, cloud: 0.5, qa: 0.3 },
  datos: { backend: 0.5 },
  cloud: { backend: 0.5 },
  frontend: { movil: 0.5, diseno: 0.4, qa: 0.3 },
  movil: { frontend: 0.5 },
  diseno: { frontend: 0.4 },
  qa: { backend: 0.3, frontend: 0.3 },
};

export function adyacencia(de: Area, a: Area): number {
  return de === a ? 1 : ADYACENCIA[de]?.[a] ?? 0;
}

// Sugerencias para los formularios del perfil.
export const SUGERENCIAS_HABILIDADES = HABILIDADES.map((s) => s.nombre);
export const SUGERENCIAS_TITULAR = [
  "Desarrollador Full Stack",
  "Desarrollador Backend",
  "Desarrollador Frontend",
  "Desarrollador Web",
  "Desarrollador Java",
  "Desarrollador .NET",
  "Desarrollador Python",
  "Ingeniero de Software",
  "Analista de Datos",
  "Científico de Datos",
  "Ingeniero DevOps",
  "Desarrollador Móvil",
  "Analista QA",
  "Diseñador UX/UI",
];

/* ---------------- Texto libre ---------------- */

// N-gramas (1 a 3 palabras) de un texto en forma de clave: "APIs REST" -> "apis",
// "rest", "apisrest". Permite buscar alias por palabras completas, sin falsos
// positivos por subcadena ("interesante" no contiene la palabra REST).
export function ngramas(texto: string): Set<string> {
  const palabras = texto.split(/[^\p{L}\p{N}+#.]+/u).map(clave).filter(Boolean);
  const set = new Set<string>();
  for (let i = 0; i < palabras.length; i++) {
    let acumulado = "";
    for (let n = 0; n < 3 && i + n < palabras.length; n++) {
      acumulado += palabras[i + n];
      set.add(acumulado);
    }
  }
  return set;
}

// Habilidades del catálogo nombradas dentro de un texto
// ("Experiencia con React y Node.js" -> React, Node.js).
export function habilidadesMencionadas(texto: string): HabilidadCatalogo[] {
  const gramas = ngramas(texto);
  return HABILIDADES.filter((s) => [s.id, s.nombre, ...s.alias].some((a) => gramas.has(clave(a))));
}

// Áreas de un cargo o titular: roles explícitos ("Backend") más las tecnologías
// que nombra ("Desarrollador Java" -> Backend). Si solo hay un rol genérico
// ("Desarrollador") se usa ese, con menor certeza.
export function rolesDeCargo(texto: string | null | undefined): RolDetectado[] {
  const roles = detectarRoles(texto);
  const especificos = roles.filter((r) => !r.generico);
  const porTecnologia = habilidadesMencionadas(texto ?? "").map((s) => ({
    nombre: s.nombre,
    areas: s.areas,
    generico: false,
  }));
  const directos = [...especificos, ...porTecnologia];
  return directos.length ? directos : roles;
}

export function areasDeCargo(texto: string | null | undefined): Area[] {
  return Array.from(new Set(rolesDeCargo(texto).flatMap((r) => r.areas)));
}
