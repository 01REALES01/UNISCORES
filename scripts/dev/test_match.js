const team = "Administración de Empresas";
const matchA = "admin";

const safeIncludes = (str1, str2) => {
    if (!str1 || !str2) return false;
    const s1 = str1.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    const s2 = str2.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    return s1.includes(s2) || s2.includes(s1);
};

console.log(safeIncludes(team, matchA));
