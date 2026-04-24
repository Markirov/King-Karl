import { mwLookup, mechAmmoFamilyFromWeaponName, mechAmmoTechFromName, mechAmmoErTagFromName, mechAmmoMetaForWeapon, mechNormEquipName, mechIsAmmoCrit, MECH_AMMO_PER_TON } from './weapons';

export const MECH_IS_TABLE: Record<number, any> = {
  20:{HD:3,CT:6,LT:5,RT:5,LA:3,RA:3,LL:4,RL:4},25:{HD:3,CT:8,LT:6,RT:6,LA:4,RA:4,LL:6,RL:6},
  30:{HD:3,CT:10,LT:7,RT:7,LA:5,RA:5,LL:7,RL:7},35:{HD:3,CT:11,LT:8,RT:8,LA:6,RA:6,LL:8,RL:8},
  40:{HD:3,CT:12,LT:10,RT:10,LA:6,RA:6,LL:10,RL:10},45:{HD:3,CT:14,LT:11,RT:11,LA:7,RA:7,LL:11,RL:11},
  50:{HD:3,CT:16,LT:12,RT:12,LA:8,RA:8,LL:12,RL:12},55:{HD:3,CT:18,LT:13,RT:13,LA:9,RA:9,LL:13,RL:13},
  60:{HD:3,CT:20,LT:14,RT:14,LA:10,RA:10,LL:14,RL:14},65:{HD:3,CT:21,LT:15,RT:15,LA:10,RA:10,LL:15,RL:15},
  70:{HD:3,CT:22,LT:15,RT:15,LA:11,RA:11,LL:15,RL:15},75:{HD:3,CT:23,LT:16,RT:16,LA:12,RA:12,LL:16,RL:16},
  80:{HD:3,CT:25,LT:17,RT:17,LA:13,RA:13,LL:17,RL:17},85:{HD:3,CT:27,LT:18,RT:18,LA:14,RA:14,LL:18,RL:18},
  90:{HD:3,CT:29,LT:19,RT:19,LA:15,RA:15,LL:19,RL:19},95:{HD:3,CT:30,LT:20,RT:20,LA:16,RA:16,LL:20,RL:20},
  100:{HD:3,CT:31,LT:21,RT:21,LA:17,RA:17,LL:21,RL:21},
};

export function mwNormLoc(raw: string){
  const m: Record<string, string> = {'left arm':'LA','right arm':'RA','left torso':'LT','right torso':'RT',
    'center torso':'CT','head':'HD','left leg':'LL','right leg':'RL',
    'la':'LA','ra':'RA','lt':'LT','rt':'RT','ct':'CT','hd':'HD','ll':'LL','rl':'RL',
    'centertorso':'CT','lefttorso':'LT','righttorso':'RT','leftarm':'LA','rightarm':'RA',
    'leftleg':'LL','rightleg':'RL',
    'centertorsorear':'CT','lefttorsorear':'LT','righttorsorear':'RT',
    'leftarmrear':'LA','rightarmrear':'RA','headrear':'HD',
    'ctr':'CT','ltr':'LT','rtr':'RT','lar':'LA','rar':'RA','hdr':'HD'};
  const k=(raw||'').toLowerCase().replace(/\s+/g,'').replace(/\((r|rear|t|turret)\)$/i,'').replace(/(rear|turret)$/i,'');
  return m[k]||m[(raw||'').toLowerCase().replace(/\s+/g,'')]||raw.toUpperCase().slice(0,2);
}

export function mechParseMTF(text: string){
  const lines=text.replace(/\r/g,'').split('\n').map(l=>l.trim());
  let chassis,model;
  if(lines[0].startsWith('Version:')){chassis=lines[1];model=lines[2];}
  else{chassis=kv('chassis');model=kv('model');}
  function kv(key: string){for(const l of lines)if(l.toLowerCase().startsWith(key.toLowerCase()+':'))return l.split(':',2)[1].trim();return '';}

  const tonnage=parseInt(kv('Mass'))||0,walkMP=parseInt(kv('Walk MP'))||0;
  const runMP=Math.ceil(walkMP*1.5),jumpMP=parseInt(kv('Jump MP'))||0;
  const hsRaw=kv('Heat Sinks'),hsCount=parseInt(hsRaw)||0,hsDouble=/double/i.test(hsRaw),diss=hsDouble?hsCount*2:hsCount;
  const configRaw=(kv('Config')||'').trim();
  const declaredQuad=/\bquad\b/i.test(configRaw);

  function av(loc: string){return parseInt(kv(loc+' Armor'))||0;}
  const armor={HD:av('HD'),CTf:av('CT'),CTr:av('RTC'),LTf:av('LT'),LTr:av('RTL'),RTf:av('RT'),RTr:av('RTR'),LA:av('LA'),RA:av('RA'),LL:av('LL'),RL:av('RL')};
  const is=MECH_IS_TABLE[tonnage]||MECH_IS_TABLE[100];

  const wIdx=lines.findIndex(l=>/^weapons:\d+/i.test(l));
  const wCount=wIdx>=0?(parseInt(lines[wIdx].split(':')[1])||0):0;
  const wMap: Record<string, any>={};let wid=1;
  const ammoTonsByFamily: Record<string, number> = {};

  const WEAPON_SLOTS: Record<string, number> = {
    'SMALLLASER':1,'MEDIUMLASER':1,'LARGELASER':2,'ERSMALL':1,'ERMEDIUM':1,'ERLARGE':2,
    'PPC':3,'ERPPC':3,'SNUBPPC':2,'SMALLPULSE':1,'MEDIUMPULSE':1,'LARGEPULSE':2,
    'FLAMER':1,'MACHINEGUN':1,'AC2':1,'AC5':4,'AC10':7,'AC20':10,
    'UAC2':3,'UAC5':5,'UAC10':7,'UAC20':10,'LBX2':4,'LBX5':5,'LBX10':6,'LBX20':11,
    'LAC2':1,'LAC5':2,'RAC2':6,'RAC5':6,'GAUSSRIFLE':7,'LGAUSS':5,'HGAUSS':6,
    'LRM5':1,'LRM10':2,'LRM15':3,'LRM20':5,'SRM2':1,'SRM4':1,'SRM6':2,
    'STREAKSRM2':1,'STREAKSRM4':1,'STREAKSRM6':2,'MRM10':2,'MRM20':3,'MRM30':5,'MRM40':7
  };
  function getWeaponSlots(name: string){
    const n = mechNormEquipName(name).replace(/^(IS|CL|CLAN)/,'');
    for(const[k,v] of Object.entries(WEAPON_SLOTS)) if(n.includes(k)) return v;
    return 1;
  }

  const LOC_MAP: Record<string, string>={'Left Arm:':'LA','Right Arm:':'RA','Left Torso:':'LT','Right Torso:':'RT','Center Torso:':'CT','Head:':'HD','Left Leg:':'LL','Right Leg:':'RL'};
  const crits: Record<string, string[]>={};let curLoc: string | null=null,curS: string[]=[];
  for(const l of lines){
    if(LOC_MAP[l]){ if(curLoc) crits[curLoc]=curS.slice(0,12); curLoc=LOC_MAP[l]; curS=[]; }
    else if(curLoc&&l&&!l.startsWith('#')&&curS.length<12) curS.push(l==='-Empty-'?'-':l);
  }
  if(curLoc) crits[curLoc]=curS.slice(0,12);

  const inferredQuad = (crits.LA||[]).some(s=>/^\s*Hip\s*$/i.test(String(s||''))) && (crits.RA||[]).some(s=>/^\s*Hip\s*$/i.test(String(s||'')));
  const isQuad = declaredQuad || inferredQuad;
  const configType = isQuad ? 'QUAD' : (configRaw ? configRaw.toUpperCase() : 'BIPED');

  const usedSlots: Record<string, Set<number>> = {};
  for(let i=wIdx+1;i<wIdx+1+wCount&&i<lines.length;i++){
    const l=lines[i];if(!l)continue;
    const parts=l.split(',');const rawName=parts[0].replace(/^\d+\s+/,'').trim();
    if(mechIsAmmoCrit(rawName)) continue; // ammo bins come from crits section, not weapons list
    const rawLoc=(parts[1]||'').trim();const ammoM=l.match(/Ammo:(\d+)/i);const ammoMax=ammoM?parseInt(ammoM[1]):null;
    const stats=mwLookup(rawName);
    const loc=mwNormLoc(rawLoc);
    const expectedSlots = getWeaponSlots(rawName);

    const isRear = /\s*\((R|Rear)\)\s*$/i.test(rawName) || /\s*\((R|Rear)\)\s*$/i.test(rawLoc)
      || /(rear)/i.test((rawLoc||'').replace(/\s+/g,''));
    const posSuffix = isRear ? ' (R)' : '';
    const baseName = stats ? stats.d : rawName.replace(/\s*\((R|Rear|T|Turret)\)\s*$/i,'').trim();
    const displayName = baseName + posSuffix;

    const slotIndices: number[] = [];
    const normName = mechNormEquipName(rawName);
    if(!usedSlots[loc]) usedSlots[loc] = new Set();
    const locSlots = crits[loc] || [];
    for(let si=0; si<locSlots.length && slotIndices.length < expectedSlots; si++){
      if(usedSlots[loc].has(si)) continue;
      if(locSlots[si] && locSlots[si]!=='-' && mechNormEquipName(locSlots[si])===normName){
        slotIndices.push(si);
        usedSlots[loc].add(si);
      }
    }

    wMap[wid]={id:wid,name:displayName,rawName,loc,locRaw:rawLoc,heat:stats?stats.h:0,dmg:stats?stats.dm:'?',r:stats?stats.r:'?',ammo:ammoMax,ammoMax,count:1,slotIndices};
    wid++;
  }

  const ammoBins: any[] = [];
  let binId = 0;
  Object.entries(crits).forEach(([loc, slots])=>{
    (slots||[]).forEach((slotName, slotIdx)=>{
      if(!slotName || slotName==='-') return;
      if(!mechIsAmmoCrit(slotName)) return;
      const meta = mechAmmoMetaForWeapon({rawName: slotName});
      if(!meta.familyKey) return;
      const perTon = MECH_AMMO_PER_TON[meta.family] || 0;
      const max = perTon;
      ammoTonsByFamily[meta.familyKey] = (ammoTonsByFamily[meta.familyKey]||0) + 1;
      ammoBins.push({id:binId++,loc,slotIdx,familyKey:meta.familyKey,family:meta.family,perTon,current:max,max});
    });
  });

  return {source:'MTF',chassis:chassis.trim(),model:model.trim(),tonnage,walkMP,runMP,jumpMP,hsCount,hsDouble,diss,configType,isQuad,armorType:kv('Armor').replace(/\(.*?\)/g,'').trim(),techBase:kv('TechBase'),era:kv('Era'),armor,is,weapons:Object.values(wMap),crits,bv:0,ammoTonsByFamily,ammoBins};
}

export function mechParseSSW(text: string){
  const doc=new DOMParser().parseFromString(text,'text/xml');
  function xt(sel: string,def=''){const e=doc.querySelector(sel);return e?e.textContent?.trim()||def:def;}
  function xa(sel: string,attr: string,def=''){const e=doc.querySelector(sel);return e?(e.getAttribute(attr)||def):def;}
  const root=doc.querySelector('mech');
  if(!root){console.error('SSW: No se encontró elemento <mech>');return null;}

  const chassis=root.getAttribute('name')||'',model=root.getAttribute('model')||'';
  const tonnage=parseInt(root.getAttribute('tons')||'0')||0;
  const bv=parseInt(xt('battle_value'))||0;

  const motiveType=(xt('motive_type')||root.getAttribute('config')||xt('configuration')||'').trim();
  let isQuad=/\bquad\b/i.test(motiveType);

  const engRating=parseInt(xa('engine','rating'))||0;
  const engType=(doc.querySelector('engine')?.textContent||'').trim();
  const isXL=/xl/i.test(engType);
  const isLight=/light/i.test(engType);
  const walkMP=tonnage>0?Math.floor(engRating/tonnage):0;
  const runMP=Math.ceil(walkMP*1.5);

  const jjLocations=Array.from(doc.querySelectorAll('jumpjets location'));
  const jumpMP=jjLocations.length;

  const hsEl=doc.querySelector('heatsinks');
  const hsCount=parseInt(hsEl?.getAttribute('number')||'10')||10;
  const hsTypeText=(hsEl?.querySelector('type')?.textContent||'single').toLowerCase();
  const hsDouble=/double/i.test(hsTypeText);
  const diss=hsDouble?hsCount*2:hsCount;

  const actEl=doc.querySelector('actuators');
  const hasLLA=actEl?.getAttribute('lla')!=='FALSE';
  const hasLH=actEl?.getAttribute('lh')==='TRUE';
  const hasRLA=actEl?.getAttribute('rla')!=='FALSE';
  const hasRH=actEl?.getAttribute('rh')==='TRUE';

  function av(t: string){
    const el=doc.querySelector('armor '+t);
    if(el)return parseInt(el.textContent||'0')||0;
    return 0;
  }
  const armor={HD:av('hd'),CTf:av('ct'),CTr:av('ctr'),LTf:av('lt'),LTr:av('ltr'),RTf:av('rt'),RTr:av('rtr'),LA:av('la'),RA:av('ra'),LL:av('ll'),RL:av('rl')};
  const is=MECH_IS_TABLE[tonnage]||MECH_IS_TABLE[100];

  const LOCS=['HD','CT','LT','RT','LA','RA','LL','RL'];
  const crits: Record<string, string[]>={};
  LOCS.forEach(l=>crits[l]=Array(l==='HD'?6:(l==='LL'||l==='RL')?6:12).fill('-'));

  crits.HD[0]='Life Support'; crits.HD[1]='Sensors'; crits.HD[2]='Cockpit';
  crits.HD[4]='Sensors'; crits.HD[5]='Life Support';

  for(let ei=0;ei<3;ei++) crits.CT[ei]='Fusion Engine';
  for(let gi=3;gi<7;gi++) crits.CT[gi]='Gyro';
  for(let ei2=7;ei2<10;ei2++) crits.CT[ei2]='Fusion Engine';

  if(isXL||isLight){
    const sideEngSlots=isXL?3:2;
    let lsStart=parseInt(xa('engine','lsstart'))||0;
    let rsStart=parseInt(xa('engine','rsstart'))||0;
    if(lsStart<0) lsStart=12-sideEngSlots;
    if(rsStart<0) rsStart=12-sideEngSlots;
    for(let s=0;s<sideEngSlots;s++){
      if(lsStart+s<12) crits.LT[lsStart+s]='Fusion Engine';
      if(rsStart+s<12) crits.RT[rsStart+s]='Fusion Engine';
    }
  }

  if(isQuad){
    crits.LA[0]='Hip'; crits.LA[1]='Upper Leg Actuator';
    crits.LA[2]='Lower Leg Actuator'; crits.LA[3]='Foot Actuator';
    crits.RA[0]='Hip'; crits.RA[1]='Upper Leg Actuator';
    crits.RA[2]='Lower Leg Actuator'; crits.RA[3]='Foot Actuator';
  } else {
    crits.LA[0]='Shoulder'; crits.LA[1]='Upper Arm Actuator';
    if(hasLLA) crits.LA[2]='Lower Arm Actuator';
    if(hasLH) crits.LA[3]='Hand Actuator';
    crits.RA[0]='Shoulder'; crits.RA[1]='Upper Arm Actuator';
    if(hasRLA) crits.RA[2]='Lower Arm Actuator';
    if(hasRH) crits.RA[3]='Hand Actuator';
  }

  crits.LL[0]='Hip'; crits.LL[1]='Upper Leg Actuator';
  crits.LL[2]='Lower Leg Actuator'; crits.LL[3]='Foot Actuator';
  crits.RL[0]='Hip'; crits.RL[1]='Upper Leg Actuator';
  crits.RL[2]='Lower Leg Actuator'; crits.RL[3]='Foot Actuator';

  jjLocations.forEach(jjEl=>{
    const loc=mwNormLoc(jjEl.textContent?.trim()||'');
    const idx=parseInt(jjEl.getAttribute('index')||'',10);
    if(!crits[loc]) return;
    if(Number.isFinite(idx) && idx>=0 && idx<crits[loc].length){
      crits[loc][idx]='Jump Jet';
    } else {
      const fi=crits[loc].findIndex(s=>s==='-');
      if(fi>=0) crits[loc][fi]='Jump Jet';
    }
  });

  const engineHS=Math.min(hsCount, Math.floor(engRating/25));
  const externalHS=hsCount-engineHS;
  const hsSlots=hsDouble?3:1;
  const hsInCrits=Array.from(doc.querySelectorAll('heatsinks location'));
  hsInCrits.forEach(hsLoc=>{
    const loc=mwNormLoc(hsLoc.textContent?.trim()||'');
    const idx=parseInt(hsLoc.getAttribute('index')||'',10);
    if(!crits[loc]) return;
    const hsName=hsDouble?'Double Heat Sink':'Heat Sink';
    if(Number.isFinite(idx) && idx>=0 && idx<crits[loc].length){
      for(let si=0;si<hsSlots && idx+si<crits[loc].length;si++){
        crits[loc][idx+si]=hsName;
      }
    } else {
      for(let si2=0;si2<hsSlots;si2++){
        const fi=crits[loc].findIndex(s=>s==='-');
        if(fi>=0) crits[loc][fi]=hsName;
      }
    }
  });

  const PASSIVE=['case','endo steel','ferro-fibrous','targeting computer','masc','guardian ecm','beagle active probe','angel ecm','null signature','chameleon'];

  // Slot count for multi-slot equipment (used when SSW only provides starting index)
  const EQUIP_SLOT_COUNT: Record<string,number> = {
    'LARGELASER':2,'ERPPC':3,'PPC':3,'SNUBPPC':2,'LARGEPULSE':2,
    'SMALLPULSE':1,'MEDIUMPULSE':1,
    'AC2':1,'AC5':4,'AC10':7,'AC20':10,
    'UAC2':3,'UAC5':5,'UAC10':7,'UAC20':10,
    'LBX2':4,'LBX5':5,'LBX10':6,'LBX20':11,
    'LAC2':1,'LAC5':2,'RAC2':6,'RAC5':6,
    'GAUSSRIFLE':7,'LGAUSS':5,'HGAUSS':6,
    'LRM5':1,'LRM10':2,'LRM15':3,'LRM20':5,
    'SRM2':1,'SRM4':1,'SRM6':2,
    'STREAKSRM2':1,'STREAKSRM4':1,'STREAKSRM6':2,
    'MRM10':2,'MRM20':3,'MRM30':5,'MRM40':7,
    'NARC':2,'INAESTHETICIST':2,
  };
  function equipSlotCount(rawName: string): number {
    const n = mechNormEquipName(rawName).replace(/^(IS|CL)/,'');
    for(const [k,v] of Object.entries(EQUIP_SLOT_COUNT)) if(n.includes(k)) return v;
    return 1;
  }

  doc.querySelectorAll('equipment').forEach(eq=>{
    const rawName=(eq.querySelector('name')?.textContent?.trim()||'').replace(/\n/g,'');
    const name=rawName.trim();
    // Support both <location> and <splitlocation> elements
    const locNodes=Array.from(eq.querySelectorAll('location, splitlocation'));
    if(!locNodes.length) return;
    // isSingleLoc: SSW variant that uses one <location> with starting index instead of one per slot
    const isSingleLoc = locNodes.length === 1;

    const isAmmoEntry = name.toLowerCase().includes('ammo') || name.includes('@');
    locNodes.forEach(locEl=>{
      const loc=mwNormLoc(locEl.textContent?.trim()||'');
      const slots=crits[loc];
      if(!slots) return;
      const idx=parseInt(locEl.getAttribute('index')||'',10);
      // <splitlocation number="N"> fills N consecutive slots explicitly
      const splitCount=parseInt(locEl.getAttribute('number')||'1',10)||1;
      if(Number.isFinite(idx) && idx>=0 && idx<slots.length){
        const fill = isAmmoEntry ? 1  // ammo always occupies exactly 1 slot
                   : splitCount > 1 ? splitCount
                   : isSingleLoc ? equipSlotCount(rawName)
                   : 1; // standard SSW: one slot per location element
        for(let s=0; s<fill && idx+s<slots.length; s++){
          if(slots[idx+s]==='-') slots[idx+s]=name;
        }
      } else {
        const fi=slots.findIndex(s=>s==='-');
        if(fi>=0) slots[fi]=name;
      }
    });
  });

  const wMap: Record<string, any>={};let wid=1;
  const ammoTonsByFamily: Record<string, number>={};
  const usedSlots: Record<string, Set<number>>={};

  doc.querySelectorAll('equipment').forEach(eq=>{
    const rawName=(eq.querySelector('name')?.textContent?.trim()||'').replace(/\n/g,'');
    const type=(eq.querySelector('type')?.textContent?.trim()||'').toLowerCase();
    // Use same query as first pass (location + splitlocation)
    const locNodes=Array.from(eq.querySelectorAll('location, splitlocation'));
    if(locNodes.length===0)return;
    const rawLoc=locNodes[0]?.textContent?.trim()||'';
    const slotsUsed=locNodes.length;
    if(type==='ammunition' || rawName.toLowerCase().includes('ammo') || rawName.includes('@ '))return;
    if(PASSIVE.some(p=>rawName.toLowerCase().includes(p)))return;
    const weaponTypes=['energy','ballistic','missile','physical','equipment'];
    const looksLikeWeapon=/laser|ppc|ac\/|autocannon|gauss|srm|lrm|mrm|flamer|mg|machine/i.test(rawName);
    if(type && !weaponTypes.includes(type) && !looksLikeWeapon)return;

    const cleanName=rawName.replace(/^\(IS\)\s*/i,'').replace(/^\(CL\)\s*/i,'').replace(/\s*\((R|Rear|T|Turret)\)\s*$/i,'').trim();
    const stats=mwLookup(rawName)||mwLookup(cleanName);
    const loc=mwNormLoc(rawLoc);

    const slotIndices: number[]=[];
    const normName=mechNormEquipName(rawName);
    if(!usedSlots[loc]) usedSlots[loc]=new Set();
    const locSlots=crits[loc]||[];
    for(let si=0;si<locSlots.length && slotIndices.length<slotsUsed;si++){
      if(usedSlots[loc].has(si)) continue;
      if(locSlots[si] && locSlots[si]!=='-' && mechNormEquipName(locSlots[si])===normName){
        slotIndices.push(si);
        usedSlots[loc].add(si);
      }
    }

    // Detect rear-facing from name OR location (SSW puts (R) on the location, not the name)
    const isRear = /\s*\((R|Rear)\)\s*$/i.test(rawName) || /\s*\((R|Rear)\)\s*$/i.test(rawLoc)
      || /(rear|ctr|ltr|rtr|lar|rar)/i.test((rawLoc||'').replace(/\s+/g,''));
    const posSuffix = isRear ? ' (R)' : '';
    const displayName=(stats?stats.d:cleanName)+posSuffix;

    wMap[wid]={id:wid,name:displayName,rawName:rawName.trim(),loc:loc,locRaw:rawLoc,
      heat:stats?.h??0,dmg:stats?.dm??'?',r:stats?.r??'?',
      ammo:null,ammoMax:null,count:1,slotsUsed:slotsUsed,slotIndices:slotIndices};
    wid++;
  });

  const ammoBins: any[]=[];
  let binId=0;
  const usedAmmoSlots: Record<string, Set<number>>={};
  doc.querySelectorAll('equipment').forEach(eq=>{
    const type=(eq.querySelector('type')?.textContent?.trim()||'').toLowerCase();
    if(type!=='ammunition')return;
    const rawName=(eq.querySelector('name')?.textContent?.trim()||'').replace(/\n/g,'');
    const meta=mechAmmoMetaForWeapon({rawName:rawName});
    if(!meta.familyKey) return;
    const locNodes=Array.from(eq.querySelectorAll('location'));
    if(!locNodes.length) return;
    const rawLoc=locNodes[0]?.textContent?.trim()||'';
    const loc=mwNormLoc(rawLoc);
    const idx=parseInt(locNodes[0].getAttribute('index')||'',10);
    let slotIdx=-1;
    if(Number.isFinite(idx) && idx>=0){
      slotIdx=idx;
    } else {
      const locSlots2=crits[loc]||[];
      const normName2=mechNormEquipName(rawName);
      if(!usedAmmoSlots[loc]) usedAmmoSlots[loc]=new Set();
      slotIdx=locSlots2.findIndex((s,i)=>!usedAmmoSlots[loc].has(i)&&s!=='-'&&mechNormEquipName(s)===normName2);
    }
    if(slotIdx<0) slotIdx=0;
    if(!usedAmmoSlots[loc]) usedAmmoSlots[loc]=new Set();
    usedAmmoSlots[loc].add(slotIdx);

    const perTon=MECH_AMMO_PER_TON[meta.family||'']||0;
    const max=perTon;
    ammoTonsByFamily[meta.familyKey]=(ammoTonsByFamily[meta.familyKey]||0)+1;
    ammoBins.push({id:binId++,loc:loc,slotIdx:slotIdx,familyKey:meta.familyKey,family:meta.family,perTon:perTon,current:max,max:max});
  });

  const inferredQuad=(crits.LA||[]).some(s=>/^\s*Hip\s*$/i.test(String(s||'')))&&(crits.RA||[]).some(s=>/^\s*Hip\s*$/i.test(String(s||'')));
  if(inferredQuad) isQuad=true;
  const configType=isQuad?'QUAD':(motiveType?motiveType.toUpperCase():'BIPED');

  return {source:'SSW',chassis:chassis,model:model,tonnage:tonnage,walkMP:walkMP,runMP:runMP,jumpMP:jumpMP,
    hsCount:hsCount,hsDouble:hsDouble,diss:diss,configType:configType,isQuad:isQuad,engineRating:engRating,
    armorType:xt('armor type'),techBase:xt('techbase'),era:xa('year','')||xt('year')||'',
    armor:armor,is:is,weapons:Object.values(wMap),crits:crits,bv:bv,ammoTonsByFamily:ammoTonsByFamily,ammoBins:ammoBins};
}

export function mechParseMech(text: string){
  const t=text.trim();
  if(t.startsWith('<?xml')||t.startsWith('<mech'))return mechParseSSW(t);
  return mechParseMTF(t);
}

// Vehicle parser
function vehicleSafeNum(v: string | null | undefined){
  const n = parseInt(v||'',10);
  return Number.isFinite(n) ? n : 0;
}

function vehicleBaseInternalFromTons(tons: string | number){
  const t = Math.max(1, vehicleSafeNum(String(tons)));
  return Math.max(1, Math.ceil(t / 10));
}

function vehicleNormLoc(loc: string){
  const s = String(loc||'').toLowerCase().trim();
  if (s.includes('front')) return 'FR';
  if (s.includes('left')) return 'LT';
  if (s.includes('right')) return 'RT';
  if (s.includes('rear')) return 'RR';
  if (s.includes('turret')) return 'TU';
  if (s.includes('rotor')) return 'RO';
  return 'BD';
}

function vehicleAmmoFamily(name: string){
  const n = mechNormEquipName(name).toUpperCase();
  let m = n.match(/(?:AC|AUTOCANNON)\s*\/?\s*(20|10|5|2)/);
  if(m) return `AC/${m[1]}`;
  m = n.match(/LRM\s*-?\s*(20|15|10|5)/);
  if(m) return `LRM-${m[1]}`;
  m = n.match(/SRM\s*-?\s*(6|4|2)/);
  if(m) return `SRM-${m[1]}`;
  if(n.includes('MACHINE GUN') || n === 'MG') return 'Machine Gun';
  return null;
}

function vehicleLookupWeapon(rawName: string){
  const clean = mechNormEquipName(rawName);
  const m = mwLookup(clean) || mwLookup(rawName);
  const name = m ? m.d : clean;
  const heat = m ? m.h : 0;
  const dmg = m ? m.dm : '?';
  const range = m ? m.r : '?';
  const family = vehicleAmmoFamily(name || clean);
  const ammoPerTon = family ? (MECH_AMMO_PER_TON[family] || null) : null;
  const oneShot = /rocket launcher/i.test(clean);
  return { name, heat, dmg, range, family, ammoPerTon, oneShot };
}

function vehicleParseAmmoTonsFromName(nm: string){
  const txt = String(nm||'');
  const frac = txt.match(/\((\d+)\s*\/\s*(\d+)\)/);
  if(frac){
    const a = parseInt(frac[1],10), b = parseInt(frac[2],10);
    if(Number.isFinite(a) && Number.isFinite(b) && b !== 0) return a/b;
  }
  const ton = txt.match(/(\d+(?:\.\d+)?)\s*T/i);
  if(ton){
    const v = parseFloat(ton[1]);
    if(Number.isFinite(v)) return v;
  }
  return 1;
}

export function vehicleParseSAW(text: string, sourceName: string){
  const xml = new DOMParser().parseFromString(text, 'application/xml');
  if (xml.querySelector('parsererror')) throw new Error('XML inválido en archivo vehículo');

  const root = xml.querySelector('combatvehicle');
  if (!root) throw new Error('No es un .saw de vehículo (falta <combatvehicle>)');

  const motiveEl = root.querySelector('motive');
  const armorEl = root.querySelector('armor');
  const loadEl = root.querySelector('baseloadout');

  const name = (root.getAttribute('name') || 'Vehículo').trim();
  const model = (root.getAttribute('model') || '').trim();
  const tons = (root.getAttribute('tons') || '').trim();
  const motiveType = (motiveEl?.getAttribute('type') || root.getAttribute('motive') || '').trim();
  const cruise = (motiveEl?.getAttribute('cruise') || '').trim();
  const turretType = (motiveEl?.getAttribute('turret') || 'No Turret').trim();

  const armor = {
    FR: vehicleSafeNum(armorEl?.querySelector('front')?.textContent),
    LT: vehicleSafeNum(armorEl?.querySelector('left')?.textContent),
    RT: vehicleSafeNum(armorEl?.querySelector('right')?.textContent),
    RR: vehicleSafeNum(armorEl?.querySelector('rear')?.textContent),
    TU: vehicleSafeNum(armorEl?.querySelector('primaryturret')?.textContent),
    T2: vehicleSafeNum(armorEl?.querySelector('secondaryturret')?.textContent),
    RO: vehicleSafeNum(armorEl?.querySelector('rotor')?.textContent)
  };

  const intBase = vehicleBaseInternalFromTons(tons);

  const locations = [
    { key:'FR', label:'FRENTE', maxArmor:armor.FR, maxIS:intBase },
    { key:'LT', label:'IZQUIERDA', maxArmor:armor.LT, maxIS:intBase },
    { key:'RT', label:'DERECHA', maxArmor:armor.RT, maxIS:intBase },
    { key:'RR', label:'TRASERA', maxArmor:armor.RR, maxIS:intBase }
  ];

  const turretUpper = turretType.toUpperCase();
  if (turretUpper.includes('SINGLE') || armor.TU > 0) locations.push({ key:'TU', label:'TORRETA', maxArmor:armor.TU, maxIS:intBase });
  if (turretUpper.includes('DUAL') || armor.T2 > 0) locations.push({ key:'T2', label:'TORRETA 2', maxArmor:armor.T2, maxIS:intBase });
  if (String(motiveType).toUpperCase().includes('VTOL') || armor.RO > 0) locations.push({ key:'RO', label:'ROTOR', maxArmor:armor.RO, maxIS:2 });

  const allEq = Array.from(loadEl?.querySelectorAll('equipment') || []);
  const ammoBins = allEq.filter(eq => String(eq.querySelector('type')?.textContent || '').trim().toLowerCase() === 'ammunition');
  const weaponsRaw = allEq.filter(eq => {
    const t = String(eq.querySelector('type')?.textContent || '').trim().toLowerCase();
    return t && t !== 'ammunition' && t !== 'equipment';
  });

  const ammoTonsByFamily: Record<string, number> = {};
  ammoBins.forEach(eq => {
    const nm = mechNormEquipName(eq.querySelector('name')?.textContent || '');
    const fam = vehicleAmmoFamily(nm);
    const t1 = parseFloat(eq.querySelector('tons')?.textContent || '');
    const tonsBin = (Number.isFinite(t1) && t1 > 0) ? t1 : vehicleParseAmmoTonsFromName(nm);
    if(fam){
      ammoTonsByFamily[fam] = (ammoTonsByFamily[fam] || 0) + tonsBin;
    }
  });

  let wid = 1;
  const weapons = weaponsRaw.map(eq => {
    const type = String(eq.querySelector('type')?.textContent || '').trim().toLowerCase();
    const nm = String(eq.querySelector('name')?.textContent || '').trim();
    const loc = String(eq.querySelector('location')?.textContent || '').trim();
    const info = vehicleLookupWeapon(nm);
    const id = wid++;
    const ammoKey = info.oneShot ? `OS:${id}` : (info.family || null);
    return {
      id,
      name: info.name,
      rawName: nm,
      type,
      loc,
      key: vehicleNormLoc(loc),
      heat: info.heat,
      dmg: info.dmg,
      r: info.range,
      ammoPerTon: info.ammoPerTon,
      family: info.family,
      oneShot: info.oneShot,
      ammoKey
    };
  });

  const ammoPools: Record<string, number> = {};
  weapons.forEach(w => {
    if(!w.ammoKey) return;
    if(w.oneShot){
      ammoPools[w.ammoKey] = 1;
      return;
    }
    const tonsAmmo = ammoTonsByFamily[w.family||''] || 0;
    const max = w.ammoPerTon ? Math.round(w.ammoPerTon * tonsAmmo) : 0;
    ammoPools[w.ammoKey] = Math.max(ammoPools[w.ammoKey] || 0, max);
  });

  const equipmentByLoc: Record<string, string[]> = {};
  allEq.forEach(eq => {
    const loc = String(eq.querySelector('location')?.textContent || '').trim();
    const key = vehicleNormLoc(loc);
    if(!equipmentByLoc[key]) equipmentByLoc[key] = [];
    const nm = mechNormEquipName(eq.querySelector('name')?.textContent || '');
    const tp = String(eq.querySelector('type')?.textContent || '').trim().toLowerCase();
    if(nm){
      equipmentByLoc[key].push(tp === 'ammunition' ? `${nm} [AMMO]` : nm);
    }
  });

  const crits: Record<string, string[]> = {};
  locations.forEach(l => {
    const base = ['Estructura'];
    if (l.key === 'FR') base.push('Control de fuego');
    if (l.key === 'LT' || l.key === 'RT') base.push('Movimiento lateral');
    if (l.key === 'RR') base.push('Motor');
    if (l.key === 'TU' || l.key === 'T2') base.push('Anillo de torreta');
    if (l.key === 'RO') base.push('Rotor principal');
    const list = [...base, ...(equipmentByLoc[l.key] || [])];
    crits[l.key] = list.length ? list : ['-'];
  });

  return { name, model, tons, motiveType, cruise, turretType, source: sourceName || 'archivo', locations, weapons, ammoPools, crits };
}
