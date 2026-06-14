export const MECH_AMMO_PER_TON: Record<string, number> = {
  'Machine Gun': 200,
  'Light Machine Gun': 200,
  'Heavy Machine Gun': 100,
  'AC/2': 45, 'AC/5': 20, 'AC/10': 10, 'AC/20': 5,
  'Ultra AC/2': 45, 'Ultra AC/5': 20, 'Ultra AC/10': 10, 'Ultra AC/20': 5,
  'LBX AC/2': 45, 'LBX AC/5': 20, 'LBX AC/10': 10, 'LBX AC/20': 5,
  'Light AC/2': 45, 'Light AC/5': 20,
  'Gauss Rifle': 8, 'Heavy Gauss': 4, 'Light Gauss': 16,
  'LRM-5': 24, 'LRM-10': 12, 'LRM-15': 8, 'LRM-20': 6,
  'SRM-2': 50, 'SRM-4': 25, 'SRM-6': 15,
  'Streak SRM-2': 50, 'Streak SRM-4': 25, 'Streak SRM-6': 15
};

export const MECH_WEAPON_DB: Record<string, any> = {
  'ISSmallLaser':{'d':'Small Laser','h':1,'dm':'3','r':'1/2/3'},
  'Small Laser':{'d':'Small Laser','h':1,'dm':'3','r':'1/2/3'},
  'ISMediumLaser':{'d':'Medium Laser','h':3,'dm':'5','r':'3/6/9'},
  'ISLargeLaser':{'d':'Large Laser','h':8,'dm':'8','r':'5/10/15'},
  'ISERSmallLaser':{'d':'ER Small Laser','h':2,'dm':'3','r':'2/4/6'},
  'ISERMediumLaser':{'d':'ER Med Laser','h':5,'dm':'5','r':'4/8/12'},
  'ISERLargeLaser':{'d':'ER Lrg Laser','h':12,'dm':'8','r':'7/14/19'},
  'ISERPPC':{'d':'ER PPC','h':15,'dm':'10','r':'7/14/23'},
  'ISERPPCCanon':{'d':'ER PPC','h':15,'dm':'10','r':'7/14/23'},
  'ISPPC':{'d':'PPC','h':10,'dm':'10','r':'6/12/18'},
  'ISSnPPC':{'d':'Snub PPC','h':10,'dm':'10','r':'3/6/10'},
  'ISMediumPulseLaser':{'d':'Med Pulse Laser','h':4,'dm':'6','r':'2/4/6'},
  'ISLargePulseLaser':{'d':'Lrg Pulse Laser','h':10,'dm':'9','r':'3/7/10'},
  'ISSmallPulseLaser':{'d':'Sm Pulse Laser','h':2,'dm':'3','r':'1/2/3'},
  'ISFlamer':{'d':'Flamer','h':3,'dm':'2','r':'1/2/3'},
  'ISAC2':{'d':'AC/2','h':1,'dm':'2','r':'8/16/24'},'ISAC5':{'d':'AC/5','h':1,'dm':'5','r':'6/12/18'},
  'ISAC10':{'d':'AC/10','h':3,'dm':'10','r':'5/10/15'},'ISAC20':{'d':'AC/20','h':7,'dm':'20','r':'3/6/9'},
  'ISUltraAC2':{'d':'Ultra AC/2','h':1,'dm':'2','r':'9/18/27'},'ISUltraAC5':{'d':'Ultra AC/5','h':1,'dm':'5','r':'7/14/21'},
  'ISUltraAC10':{'d':'Ultra AC/10','h':4,'dm':'10','r':'6/12/18'},'ISUltraAC20':{'d':'Ultra AC/20','h':8,'dm':'20','r':'4/8/12'},
  'ISLBXAC2':{'d':'LBX AC/2','h':1,'dm':'2','r':'9/18/27'},'ISLBXAC5':{'d':'LBX AC/5','h':1,'dm':'5','r':'7/14/21'},
  'ISLBXAC10':{'d':'LBX AC/10','h':2,'dm':'10','r':'6/12/18'},'ISLBXAC20':{'d':'LBX AC/20','h':6,'dm':'20','r':'4/8/12'},
  'ISLightAC2':{'d':'Light AC/2','h':1,'dm':'2','r':'6/12/18'},'ISLightAC5':{'d':'Light AC/5','h':2,'dm':'5','r':'5/10/15'},
  'ISLAC2':{'d':'Light AC/2','h':1,'dm':'2','r':'6/12/18'},'ISLAC5':{'d':'Light AC/5','h':2,'dm':'5','r':'5/10/15'},
  'ISGaussRifle':{'d':'Gauss Rifle','h':1,'dm':'15','r':'7/15/22'},'ISHGaussRifle':{'d':'Heavy Gauss','h':2,'dm':'25','r':'4/8/16'},
  'ISLGaussRifle':{'d':'Light Gauss','h':1,'dm':'8','r':'8/17/25'},'ISMachineGun':{'d':'Machine Gun','h':0,'dm':'2','r':'1/2/3'},
  'ISRotaryAC2':{'d':'RAC/2','h':6,'dm':'2','r':'8/17/25'},'ISRotaryAC5':{'d':'RAC/5','h':6,'dm':'5','r':'5/10/15'},
  'ISLRM5':{'d':'LRM-5','h':2,'dm':'1/m','r':'7/14/21'},'ISLRM10':{'d':'LRM-10','h':4,'dm':'1/m','r':'7/14/21'},
  'ISLRM15':{'d':'LRM-15','h':5,'dm':'1/m','r':'7/14/21'},'ISLRM20':{'d':'LRM-20','h':6,'dm':'1/m','r':'7/14/21'},
  'ISSRM2':{'d':'SRM-2','h':2,'dm':'2/m','r':'3/6/9'},'ISSRM4':{'d':'SRM-4','h':3,'dm':'2/m','r':'3/6/9'},
  'ISSRM6':{'d':'SRM-6','h':4,'dm':'2/m','r':'3/6/9'},
  'ISStreakSRM2':{'d':'Streak SRM-2','h':2,'dm':'2/m','r':'3/6/9'},'ISStreakSRM4':{'d':'Streak SRM-4','h':3,'dm':'2/m','r':'3/6/9'},
  'ISStreakSRM6':{'d':'Streak SRM-6','h':4,'dm':'2/m','r':'3/6/9'},
  'CLERMediumLaser':{'d':'(CL) ER Med Laser','h':5,'dm':'7','r':'5/10/15'},
  'CLERLargeLaser':{'d':'(CL) ER Lrg Laser','h':12,'dm':'10','r':'8/15/25'},
  'CLERPPC':{'d':'(CL) ER PPC','h':15,'dm':'15','r':'7/14/23'},
  'CLGaussRifle':{'d':'(CL) Gauss Rifle','h':1,'dm':'15','r':'7/15/22'},
  'CLUltraAC20':{'d':'(CL) Ultra AC/20','h':7,'dm':'20','r':'4/8/12'},
  'CLSRM6':{'d':'(CL) SRM-6','h':4,'dm':'2/m','r':'3/6/9'},
  'CLStreakSRM6':{'d':'(CL) Streak SRM-6','h':4,'dm':'2/m','r':'3/6/9'},
  'CLLRM20':{'d':'(CL) LRM-20','h':6,'dm':'1/m','r':'7/14/21'},
  'Medium Laser':{'d':'Medium Laser','h':3,'dm':'5','r':'3/6/9'},
  'Large Laser':{'d':'Large Laser','h':8,'dm':'8','r':'5/10/15'},
  'PPC':{'d':'PPC','h':10,'dm':'10','r':'6/12/18'},
  'ER Medium Laser':{'d':'ER Med Laser','h':5,'dm':'5','r':'4/8/12'},
  'ER Large Laser':{'d':'ER Lrg Laser','h':12,'dm':'8','r':'7/14/19'},
  'SRM 2':{'d':'SRM-2','h':2,'dm':'2/m','r':'3/6/9'},'SRM 4':{'d':'SRM-4','h':3,'dm':'2/m','r':'3/6/9'},
  'SRM 6':{'d':'SRM-6','h':4,'dm':'2/m','r':'3/6/9'},
  'LRM 5':{'d':'LRM-5','h':2,'dm':'1/m','r':'7/14/21'},'LRM 10':{'d':'LRM-10','h':4,'dm':'1/m','r':'7/14/21'},
  'LRM 15':{'d':'LRM-15','h':5,'dm':'1/m','r':'7/14/21'},'LRM 20':{'d':'LRM-20','h':6,'dm':'1/m','r':'7/14/21'},
  'Autocannon/2':{'d':'AC/2','h':1,'dm':'2','r':'8/16/24'},'Autocannon/5':{'d':'AC/5','h':1,'dm':'5','r':'6/12/18'},
  'Autocannon/10':{'d':'AC/10','h':3,'dm':'10','r':'5/10/15'},'Autocannon/20':{'d':'AC/20','h':7,'dm':'20','r':'3/6/9'},
  'Gauss Rifle':{'d':'Gauss Rifle','h':1,'dm':'15','r':'7/15/22'},
  'Light AC/2':{'d':'Light AC/2','h':1,'dm':'2','r':'6/12/18'},'Light AC/5':{'d':'Light AC/5','h':2,'dm':'5','r':'5/10/15'},
};

export const WEAPONS_MIN_EMBEDDED: Record<string, any> = {
  "(CL) ER Large Laser": { "Heat": 12, "DamSht": 10, "RngSht": 8, "RngMed": 15, "RngLng": 25, "HasAmmo": false, "IsCluster": false },
  "(CL) ER Medium Laser": { "Heat": 5, "DamSht": 7, "RngSht": 5, "RngMed": 10, "RngLng": 15, "HasAmmo": false, "IsCluster": false },
  "(CL) ER Small Laser": { "Heat": 2, "DamSht": 5, "RngSht": 2, "RngMed": 4, "RngLng": 6, "HasAmmo": false, "IsCluster": false },
  "(CL) ER PPC": { "Heat": 15, "DamSht": 15, "RngSht": 7, "RngMed": 14, "RngLng": 23, "HasAmmo": false, "IsCluster": false },
  "(CL) Gauss Rifle": { "Heat": 1, "DamSht": 15, "RngSht": 7, "RngMed": 15, "RngLng": 22, "HasAmmo": true, "IsCluster": false },
  "(CL) LRM-20": { "Heat": 6, "DamSht": 1, "RngSht": 7, "RngMed": 14, "RngLng": 21, "HasAmmo": true, "IsCluster": true },
  "(CL) LRM-15": { "Heat": 5, "DamSht": 1, "RngSht": 7, "RngMed": 14, "RngLng": 21, "HasAmmo": true, "IsCluster": true },
  "(CL) LRM-10": { "Heat": 4, "DamSht": 1, "RngSht": 7, "RngMed": 14, "RngLng": 21, "HasAmmo": true, "IsCluster": true },
  "(CL) LRM-5": { "Heat": 2, "DamSht": 1, "RngSht": 7, "RngMed": 14, "RngLng": 21, "HasAmmo": true, "IsCluster": true },
  "(CL) SRM-6": { "Heat": 4, "DamSht": 2, "RngSht": 3, "RngMed": 6, "RngLng": 9, "HasAmmo": true, "IsCluster": true },
  "(CL) SRM-4": { "Heat": 3, "DamSht": 2, "RngSht": 3, "RngMed": 6, "RngLng": 9, "HasAmmo": true, "IsCluster": true },
  "(CL) SRM-2": { "Heat": 2, "DamSht": 2, "RngSht": 3, "RngMed": 6, "RngLng": 9, "HasAmmo": true, "IsCluster": true },
  "(CL) Streak SRM-6": { "Heat": 4, "DamSht": 2, "RngSht": 4, "RngMed": 8, "RngLng": 12, "HasAmmo": true, "IsCluster": true },
  "(CL) Ultra AC/20": { "Heat": 7, "DamSht": 20, "RngSht": 4, "RngMed": 8, "RngLng": 12, "HasAmmo": true, "IsCluster": true },
  "(CL) Ultra AC/10": { "Heat": 3, "DamSht": 10, "RngSht": 6, "RngMed": 12, "RngLng": 18, "HasAmmo": true, "IsCluster": true },
  "(CL) Ultra AC/5": { "Heat": 1, "DamSht": 5, "RngSht": 7, "RngMed": 14, "RngLng": 21, "HasAmmo": true, "IsCluster": true },
  "(CL) Ultra AC/2": { "Heat": 1, "DamSht": 2, "RngSht": 9, "RngMed": 18, "RngLng": 27, "HasAmmo": true, "IsCluster": true },
  "(CL) LB 20-X AC": { "Heat": 6, "DamSht": 20, "RngSht": 4, "RngMed": 8, "RngLng": 12, "HasAmmo": true, "IsCluster": true },
  "(CL) LB 10-X AC": { "Heat": 2, "DamSht": 10, "RngSht": 6, "RngMed": 12, "RngLng": 18, "HasAmmo": true, "IsCluster": true },
  "(CL) Machine Gun": { "Heat": 0, "DamSht": 2, "RngSht": 1, "RngMed": 2, "RngLng": 3, "HasAmmo": true, "IsCluster": false },
  "(IS) Autocannon/20": { "Heat": 7, "DamSht": 20, "RngSht": 3, "RngMed": 6, "RngLng": 9, "HasAmmo": true, "IsCluster": false },
  "(IS) Autocannon/10": { "Heat": 3, "DamSht": 10, "RngSht": 5, "RngMed": 10, "RngLng": 15, "HasAmmo": true, "IsCluster": false },
  "(IS) Autocannon/5": { "Heat": 1, "DamSht": 5, "RngSht": 6, "RngMed": 12, "RngLng": 18, "HasAmmo": true, "IsCluster": false },
  "(IS) Autocannon/2": { "Heat": 1, "DamSht": 2, "RngSht": 8, "RngMed": 16, "RngLng": 24, "HasAmmo": true, "IsCluster": false },
  "(IS) LRM-20": { "Heat": 6, "DamSht": 1, "RngSht": 7, "RngMed": 14, "RngLng": 21, "HasAmmo": true, "IsCluster": true },
  "(IS) LRM-15": { "Heat": 5, "DamSht": 1, "RngSht": 7, "RngMed": 14, "RngLng": 21, "HasAmmo": true, "IsCluster": true },
  "(IS) LRM-10": { "Heat": 4, "DamSht": 1, "RngSht": 7, "RngMed": 14, "RngLng": 21, "HasAmmo": true, "IsCluster": true },
  "(IS) LRM-5": { "Heat": 2, "DamSht": 1, "RngSht": 7, "RngMed": 14, "RngLng": 21, "HasAmmo": true, "IsCluster": true },
  "(IS) SRM-6": { "Heat": 4, "DamSht": 2, "RngSht": 3, "RngMed": 6, "RngLng": 9, "HasAmmo": true, "IsCluster": true },
  "(IS) SRM-4": { "Heat": 3, "DamSht": 2, "RngSht": 3, "RngMed": 6, "RngLng": 9, "HasAmmo": true, "IsCluster": true },
  "(IS) SRM-2": { "Heat": 2, "DamSht": 2, "RngSht": 3, "RngMed": 6, "RngLng": 9, "HasAmmo": true, "IsCluster": true },
  "(IS) Machine Gun": { "Heat": 0, "DamSht": 2, "RngSht": 1, "RngMed": 2, "RngLng": 3, "HasAmmo": true, "IsCluster": false },
  "(IS) Flamer": { "Heat": 3, "DamSht": 2, "RngSht": 1, "RngMed": 2, "RngLng": 3, "HasAmmo": false, "IsCluster": false },
  "(IS) Medium Laser": { "Heat": 3, "DamSht": 5, "RngSht": 3, "RngMed": 6, "RngLng": 9, "HasAmmo": false, "IsCluster": false },
  "(IS) Large Laser": { "Heat": 8, "DamSht": 8, "RngSht": 5, "RngMed": 10, "RngLng": 15, "HasAmmo": false, "IsCluster": false },
  "(IS) Small Laser": { "Heat": 1, "DamSht": 3, "RngSht": 1, "RngMed": 2, "RngLng": 3, "HasAmmo": false, "IsCluster": false },
  "(IS) PPC": { "Heat": 10, "DamSht": 10, "RngSht": 6, "RngMed": 12, "RngLng": 18, "HasAmmo": false, "IsCluster": false },
};

export function weaponMiniToDbEntry(rec: any, fallbackName: string){
  const heat = parseInt(rec?.Heat, 10);
  const dSht = rec?.DamSht;
  const dmgBase = (dSht === null || dSht === undefined || dSht === '') ? '?' : String(dSht);
  const type = String(rec?.type || '').toUpperCase();
  const isCluster = !!rec?.IsCluster || /^(LRM|SRM|MRM|LRT|SRT|ATM)/.test(type);
  const dmg = (isCluster && dmgBase !== '?') ? (dmgBase + '/m') : dmgBase;

  const rs = (rec?.RngSht ?? '?');
  const rm = (rec?.RngMed ?? '?');
  const rl = (rec?.RngLng ?? '?');

  return {
    d: String(rec?.ActualName || fallbackName || 'Arma'),
    h: Number.isFinite(heat) ? heat : 0,
    dm: dmg,
    r: `${rs}/${rm}/${rl}`
  };
}

export function weaponMiniAddAlias(alias: string, entry: any){
  const k = String(alias || '').trim();
  if(!k) return;

  const existing = MECH_WEAPON_DB[k];
  if(!existing){
    MECH_WEAPON_DB[k] = entry;
    return;
  }

  const exName = String(existing?.d || '');
  const nwName = String(entry?.d || '');
  const exProto = /prototype/i.test(exName);
  const nwProto = /prototype/i.test(nwName);
  if(exProto && !nwProto){
    MECH_WEAPON_DB[k] = entry;
  }
}

export function weaponMiniHydrateDatabase(data: any){
  if(!data || typeof data !== 'object') return;
  for(const [lookupName, rec] of Object.entries(data)){
    const entry = weaponMiniToDbEntry(rec, lookupName);
    const mega = String((rec as any)?.MegaMekName || '').trim();
    const actual = String((rec as any)?.ActualName || '').trim();
    const cleanLookup = String(lookupName || '')
      .replace(/^\((IS|CL|CLAN)\)\s*/i, '')
      .trim();

    weaponMiniAddAlias(lookupName, entry);
    weaponMiniAddAlias(cleanLookup, entry);
    weaponMiniAddAlias(mega, entry);
    weaponMiniAddAlias(actual, entry);
  }
}

// Initialize the DB
weaponMiniHydrateDatabase(WEAPONS_MIN_EMBEDDED);

export function mwLookup(name: string){
  if(!name)return null;
  const base = name.replace(/\s*\((R|Rear|T|Turret)\)\s*$/i,'').trim();
  if(MECH_WEAPON_DB[base])return MECH_WEAPON_DB[base];
  if(MECH_WEAPON_DB[name])return MECH_WEAPON_DB[name];
  const c=base.replace(/^\(IS\)\s*/i,'').replace(/^\(CL\)\s*/i,'').trim();
  if(MECH_WEAPON_DB[c])return MECH_WEAPON_DB[c];
  const n=c.replace(/\s+/g,'').replace(/\//g,'').replace(/-/g,'');
  for(const[k,v]of Object.entries(MECH_WEAPON_DB)){
    if(k.replace(/\s+/g,'').replace(/\//g,'').replace(/-/g,'').toLowerCase()===n.toLowerCase())return v;
  }
  return null;
}

export function mechAmmoFamilyFromWeaponName(name: string){
  const n=String(name||'').trim()
    .replace(/^@\s*/,'')
    .replace(/^\((IS|CL|CLAN)\)\s*/i,'')
    .replace(/^(IS|CL|CLAN)\s*/i,'')
    .replace(/^Ammo\s+/i,'')        // "IS Ammo LRM-10" → strip "Ammo " prefix
    .replace(/\bAMMO\b.*$/i,'')
    .replace(/\(.*?\)/g,'')
    .replace(/\bAuto\s*[Cc]annon\b/g,'AC')
    .replace(/\s+/g,' ')
    .trim();

  const m=n.match(/\b((?:Ultra\s*|LBX\s*|Light\s*)?AC\s*\/?\s*\d+|LRM[-\s/]?\d+|SRM[-\s/]?\d+|Streak\s*SRM[-\s/]?\d+|Gauss\s*Rifle|Heavy\s*Gauss|Light\s*Gauss|Heavy\s*Machine\s*Gun|Light\s*Machine\s*Gun|Machine\s*Gun|HMG|LMG|MG)\b/i);
  if(!m) return null;

  let f=m[1].replace(/\s+/g,' ').trim();
  f=f.replace(/^((?:Ultra|LBX|Light)\s*)?AC\s*\/?\s*(\d+)$/i,(_,pre,num)=>(pre?pre.trim()+' ':'')+'AC/'+num);
  f=f.replace(/^LRM[-\s/]?(\d+)$/i,'LRM-$1').replace(/^SRM[-\s/]?(\d+)$/i,'SRM-$1').replace(/^Streak\s*SRM[-\s/]?(\d+)$/i,'Streak SRM-$1');
  f=f.replace(/^Ultra\s*AC\/?(\d+)$/i,'Ultra AC/$1').replace(/^LBX\s*AC\/?(\d+)$/i,'LBX AC/$1').replace(/^Light\s*AC\/?(\d+)$/i,'Light AC/$1');
  f=f.replace(/^HMG$/i,'Heavy Machine Gun').replace(/^LMG$/i,'Light Machine Gun').replace(/^MG$/i,'Machine Gun');
  f=f.replace(/^Gauss\s*Rifle$/i,'Gauss Rifle').replace(/^Heavy\s*Gauss$/i,'Heavy Gauss').replace(/^Light\s*Gauss$/i,'Light Gauss').replace(/^Machine\s*Gun$/i,'Machine Gun');

  return f;
}

export function mechAmmoTechFromName(name: string){
  const n=String(name||'').trim();
  if(/^\(CL\)/i.test(n) || /\bCLAN\b/i.test(n)) return 'CL';
  if(/^\(IS\)/i.test(n) || /\bINNER\s*SPHERE\b/i.test(n)) return 'IS';
  return 'IS';
}

export function mechAmmoErTagFromName(name: string){
  return /\bER\b/i.test(String(name||'')) ? 'ER' : 'STD';
}

export function mechAmmoMetaForWeapon(w: any){
  const src = String(w?.rawName || w?.name || '');
  const fam = mechAmmoFamilyFromWeaponName(src);
  if(!fam) return { family:null, familyKey:null, perTon:null, use:0, usesAmmo:false };
  const tech = mechAmmoTechFromName(src);
  const er = mechAmmoErTagFromName(src);
  const perTon = MECH_AMMO_PER_TON[fam] || null;
  const familyKey = tech+ ':' + er + ':' + fam;
  return { family:fam, familyKey, perTon:perTon, use:1, usesAmmo:true };
}

export function mechNormEquipName(n: string){
  return String(n||'')
    .normalize('NFKD')
    .replace(/^\d+\.\s*/,'')
    .replace(/\s*\((R|Rear|T|Turret)\)\s*$/i,'')
    .replace(/^\(?(IS|CL|Clan)\)?\s*/i,'')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g,'');
}

export function mechIsAmmoCrit(name: string){
  const n = String(name||'');
  const nl = n.toLowerCase();
  if(nl.includes('ammo') || nl.includes('municion') || nl.includes('munición')) return true;
  if(n.includes('@')) return true;
  return false;
}
