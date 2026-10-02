const { chromium } = require(process.env.PLAYWRIGHT_MODULE);
const assert = require('node:assert/strict');
function transportFixture(){
  const name=Buffer.from('AndroidManifest.xml'),data=Buffer.from('<manifest package="test.transport.fixture"/>');let crc=0xffffffff;
  for(const byte of data){crc^=byte;for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}crc=(crc^0xffffffff)>>>0;
  const local=Buffer.alloc(30);local.writeUInt32LE(0x04034b50);local.writeUInt16LE(20,4);local.writeUInt32LE(crc,14);local.writeUInt32LE(data.length,18);local.writeUInt32LE(data.length,22);local.writeUInt16LE(name.length,26);
  const central=Buffer.alloc(46);central.writeUInt32LE(0x02014b50);central.writeUInt16LE(20,4);central.writeUInt16LE(20,6);central.writeUInt32LE(crc,16);central.writeUInt32LE(data.length,20);central.writeUInt32LE(data.length,24);central.writeUInt16LE(name.length,28);
  const end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50);end.writeUInt16LE(1,8);end.writeUInt16LE(1,10);end.writeUInt32LE(central.length+name.length,12);end.writeUInt32LE(local.length+name.length+data.length,16);
  return Buffer.concat([local,name,data,central,name,end]);
}

(async()=>{
  const browser=await chromium.launch({channel:'chrome',headless:true});
  const page=await browser.newPage({viewport:{width:1440,height:1100}});
  const failures=[];page.on('pageerror',e=>failures.push(e.message));
  page.on('requestfailed',r=>console.error('REQUEST_FAILED',r.url(),r.failure()?.errorText));
  page.on('console',m=>{if(m.type()==='error')console.error('BROWSER_ERROR',m.text())});
  try {
    await page.goto('http://localhost:4400/login');
    await page.getByLabel('Usuario',{exact:true}).fill(process.env.E2E_USERNAME);
    await page.getByLabel('Contraseña',{exact:true}).fill(process.env.E2E_PASSWORD);
    await page.getByRole('button',{name:'Iniciar sesión'}).click();
    await page.waitForURL('**/dashboard');
    await page.getByRole('heading',{name:'Dashboard',exact:true}).waitFor();
    const token=await page.evaluate(()=>sessionStorage.getItem('lc_token'));
    const headers={Authorization:'Bearer '+token};
    const health=await page.request.get('http://localhost:8081/api/system/health');assert.equal((await health.json()).database,'license_system');
    const me=await page.request.get('http://localhost:8081/api/auth/me',{headers});assert.equal((await me.json()).username,process.env.E2E_USERNAME);
    const systems=await (await page.request.get('http://localhost:8081/api/admin/lookups/systems',{headers})).json();
    const types=await (await page.request.get('http://localhost:8081/api/admin/lookups/user-types',{headers})).json();
    const employee=types.find(x=>x.label.startsWith('EMPLOYEE'));
    const run=Date.now().toString();const created=[];
    for(const target of ['LICENSE_CONTROL','ETIC_PDM_ANDROID']){
      const name='lc_e2e_'+target.toLowerCase()+'_'+run;
      await page.goto('http://localhost:4400/usuarios');
      await page.getByRole('button',{name:'Nuevo usuario',exact:true}).click();
      const dialog=page.locator('.modal form');
      await dialog.getByLabel('Usuario',{exact:true}).fill(name);
      await dialog.getByLabel('Nombre',{exact:true}).fill('Prueba integral');
      await dialog.getByLabel('Apellido paterno',{exact:true}).fill(target);
      await dialog.locator('.grid select').first().selectOption(employee.id);
      await dialog.getByLabel('Contraseña',{exact:true}).fill(process.env.E2E_PASSWORD);
      await dialog.getByRole('button',{name:'Guardar',exact:true}).click();
      await page.getByRole('heading',{name:'Detalle del usuario',exact:true}).waitFor();
      const panel=page.locator('app-user-systems');
      await panel.locator('.toolbar select').selectOption(systems.find(x=>x.label.startsWith(target)).id);
      await panel.getByRole('button',{name:'Asignar sistema',exact:true}).click();
      await panel.getByRole('button',{name:'Roles y atributos',exact:true}).click();
      const role=target==='LICENSE_CONTROL'?'SUPER_ADMIN':'THERMOGRAPHER';
      await panel.getByLabel(new RegExp(role)).check();
      await panel.getByRole('button',{name:'Guardar roles',exact:true}).click();
      await panel.getByText('Roles guardados',{exact:true}).waitFor();
      if(target==='ETIC_PDM_ANDROID'){
        await panel.locator('select').filter({has:page.locator('option[value="LEVEL_II"]')}).selectOption('LEVEL_II');
        await panel.getByRole('button',{name:'Guardar atributos',exact:true}).click();
        await panel.getByText('Atributos guardados',{exact:true}).waitFor();
      }
      const result=await page.request.get('http://localhost:8081/api/admin/users?search='+name,{headers});
      const user=(await result.json())[0];assert(user);created.push({username:name,id:user.Id_User,system:target});
      const assigned=await (await page.request.get(`http://localhost:8081/api/admin/users/${user.Id_User}/systems`,{headers})).json();assert.equal(assigned.length,1);
      const sid=assigned[0].Id_System;
      const roles=await (await page.request.get(`http://localhost:8081/api/admin/users/${user.Id_User}/systems/${sid}/roles`,{headers})).json();assert(roles.some(r=>r.Code===role&&r.Assigned));
      if(target==='ETIC_PDM_ANDROID'){
        const attributes=await (await page.request.get(`http://localhost:8081/api/admin/users/${user.Id_User}/systems/${sid}/attributes`,{headers})).json();assert.equal(attributes.find(a=>a.Code==='CERTIFICATION_LEVEL').Value_Text,'LEVEL_II');
        await panel.getByRole('button',{name:'Roles y atributos',exact:true}).click();
        await page.waitForFunction(()=>[...document.querySelectorAll('app-user-systems select')].some(s=>s.value==='LEVEL_II'));
      }
      await dialog.getByRole('button',{name:'Cancelar',exact:true}).click();
      await page.getByPlaceholder('Usuario, nombre o email').fill(name);
      await page.getByPlaceholder('Usuario, nombre o email').press('Enter');
      await page.getByRole('button',{name:'Ver / Editar',exact:true}).first().click();
      await page.getByLabel('Nombre',{exact:true}).fill('Prueba editada');
      await page.getByRole('button',{name:'Guardar',exact:true}).click();
      await page.getByRole('button',{name:'Cancelar',exact:true}).click();
    }
    const systemCode='LC_E2E_'+run;
    await page.goto('http://localhost:4400/sistemas');await page.getByRole('button',{name:'Nuevo',exact:true}).click();
    let form=page.locator('.modal form');await form.getByLabel('Código',{exact:true}).fill(systemCode);await form.getByLabel('Nombre',{exact:true}).fill('Sistema integral '+run);await form.locator('select[name="System_Type"]').selectOption('WEB');await form.getByRole('button',{name:'Guardar',exact:true}).click();await form.waitFor({state:'hidden'});
    const temporary=(await (await page.request.get('http://localhost:8081/api/admin/systems?search='+systemCode,{headers})).json())[0];assert(temporary);
    const entities={};
    for(const [route,resource,code] of [['roles','roles','TEST_OPERATOR'],['permisos','permissions','TEST_READ']]){
      await page.goto('http://localhost:4400/'+route);await page.getByRole('button',{name:'Nuevo',exact:true}).click();form=page.locator('.modal form');await form.locator('select[name="Id_System"]').selectOption(temporary.Id_System);await form.getByLabel('Código',{exact:true}).fill(code);await form.getByLabel('Nombre',{exact:true}).fill(code);await form.getByRole('button',{name:'Guardar',exact:true}).click();await form.waitFor({state:'hidden'});
      entities[resource]=(await (await page.request.get(`http://localhost:8081/api/admin/${resource}?Id_System=${temporary.Id_System}`,{headers})).json())[0];assert(entities[resource]);
    }
    await page.goto('http://localhost:4400/roles-permisos');await page.locator('.panel>label select').first().selectOption(temporary.Id_System);await page.locator('.panel>label select').nth(1).selectOption(entities.roles.Id_Role);await page.getByLabel(/TEST_READ/).check();await page.getByRole('button',{name:'Guardar permisos',exact:true}).click();await page.getByText('Permisos guardados',{exact:true}).waitFor();
    const permissions=await (await page.request.get(`http://localhost:8081/api/admin/roles/${entities.roles.Id_Role}/permissions`,{headers})).json();assert(permissions.some(p=>p.Id_Permission===entities.permissions.Id_Permission&&p.Assigned));
    const applications=await (await page.request.get('http://localhost:8081/api/admin/lookups/applications',{headers})).json();
    await page.goto('http://localhost:4400/accesos');await page.getByRole('button',{name:'Nuevo',exact:true}).click();form=page.locator('.modal form');await form.locator('select[name="Id_Usuario"]').selectOption(created[1].id);await form.locator('select[name="Id_Application"]').selectOption(applications[0].id);await form.getByLabel('Desde',{exact:true}).fill('2026-10-01');await form.getByLabel('Hasta',{exact:true}).fill('2027-10-01');await form.getByLabel('Máximo dispositivos',{exact:true}).fill('3');await form.getByRole('button',{name:'Guardar',exact:true}).click();await form.waitFor({state:'hidden'});
    const access=(await (await page.request.get(`http://localhost:8081/api/admin/application-access?Id_Usuario=${created[1].id}`,{headers})).json())[0];assert.equal(access.Max_Devices,3);
    await page.locator('tbody tr').filter({hasText:created[1].username}).getByRole('button',{name:'Ver / Editar',exact:true}).click();assert.equal(await page.getByLabel('Máximo dispositivos',{exact:true}).inputValue(),'3');await page.getByRole('button',{name:'Cancelar',exact:true}).click();
    created.push({system:systemCode,id:temporary.Id_System,role:entities.roles.Id_Role,permission:entities.permissions.Id_Permission,applicationAccess:access.Id_Access});
    await page.goto('http://localhost:4400/versiones');await page.locator('.toolbar select').selectOption(applications[0].id);await page.getByRole('button',{name:'Subir APK',exact:true}).click();form=page.locator('.modal form');
    const payload=transportFixture(),versionName='Transport fixture '+run;await form.getByLabel('Nombre de versión',{exact:true}).fill(versionName);await form.locator('input[type="file"]').setInputFiles({name:'transport-fixture.apk',mimeType:'application/vnd.android.package-archive',buffer:payload});await form.getByRole('button',{name:'Guardar',exact:true}).click();await form.waitFor({state:'hidden'});
    const version=(await (await page.request.get(`http://localhost:8081/api/admin/applications/${applications[0].id}/versions?search=${encodeURIComponent(versionName)}`,{headers})).json())[0];assert.equal(version.Version_Code,null);assert.equal(version.File_Size,payload.length);assert(!version.Is_Published);
    const download=await page.request.get(`http://localhost:8081/api/admin/applications/${applications[0].id}/versions/${version.Id_Version}/file`,{headers});assert.deepEqual(await download.body(),payload);created.push({version:version.Id_Version,name:versionName,fixture:'Solo transporte; no es un APK instalable ni firmado'});
    for(const route of ['sistemas','roles','permisos','roles-permisos','atributos','aplicaciones','versiones','accesos','licencias','dispositivos','auditoria']){
      await page.goto('http://localhost:4400/'+route);await page.locator('h1').waitFor();
      assert(!(await page.locator('body').innerText()).includes('No fue posible consultar'));
    }
    await page.screenshot({path:'tools/license-control-local.png',fullPage:true});
    assert.deepEqual(failures,[]);
    console.log(JSON.stringify({status:'PASS',flows:['A: Login → Dashboard','B: EMPLOYEE → LICENSE_CONTROL → SUPER_ADMIN','C: ETIC_PDM_ANDROID → THERMOGRAPHER → LEVEL_II','D: Sistema → Rol → Permiso','E: Aplicación → Max_Devices=3 → Vigencia','Consulta y edición de usuarios','Navegación de módulos'],created},null,2));
  } catch(error){await page.screenshot({path:'tools/license-control-error.png',fullPage:true});console.error(error);console.error(await page.locator('body').innerText());process.exitCode=1;} finally{await browser.close();}
})();
