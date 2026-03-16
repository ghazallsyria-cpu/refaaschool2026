'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, Search, Edit, Trash2, X, Key } from 'lucide-react'

export default function StudentsPage() {

const [students,setStudents] = useState<any[]>([])
const [loading,setLoading] = useState(true)
const [searchTerm,setSearchTerm] = useState('')

const [sections,setSections] = useState<any[]>([])
const [parents,setParents] = useState<any[]>([])

const [showPasswordResetModal,setShowPasswordResetModal] = useState(false)

const [resetPasswordForm,setResetPasswordForm] = useState({
userId:'',
newPassword:''
})

const [notification,setNotification] = useState<{
type:'success'|'error'
message:string
}|null>(null)


function showNotification(type:'success'|'error',message:string){

setNotification({type,message})

setTimeout(()=>{
setNotification(null)
},5000)

}


async function fetchStudents(){

setLoading(true)

const {data,error} = await supabase
.from('students')
.select(`
id,
national_id,
parent_id,
users(full_name,email,phone),
sections(name,classes(name)),
parents(users(full_name))
`)

if(!error){
setStudents(data || [])
}

setLoading(false)

}


async function fetchSections(){

const {data} = await supabase
.from('sections')
.select('id,name,classes(name)')

setSections(data || [])

}


async function fetchParents(){

const {data} = await supabase
.from('parents')
.select('id,users(full_name)')

setParents(data || [])

}


async function handleDelete(id:string){

if(!confirm('هل أنت متأكد من حذف الطالب؟')) return

const {data:{session}} = await supabase.auth.getSession()

const res = await fetch(`/api/users/delete?id=${id}`,{
method:'DELETE',
headers:{
Authorization:`Bearer ${session?.access_token}`
}
})

if(res.ok){

showNotification('success','تم حذف الطالب')

fetchStudents()

}else{

showNotification('error','فشل حذف الطالب')

}

}


function handleResetPasswordClick(student:any){

setResetPasswordForm({
userId:student.id,
newPassword:''
})

setShowPasswordResetModal(true)

}


async function handleResetPasswordSubmit(){

const {data:{session}} = await supabase.auth.getSession()

const res = await fetch('/api/users/reset-password',{
method:'POST',
headers:{
'Content-Type':'application/json',
Authorization:`Bearer ${session?.access_token}`
},
body:JSON.stringify(resetPasswordForm)
})

if(res.ok){

showNotification('success','تم تغيير كلمة المرور')

setShowPasswordResetModal(false)

}else{

showNotification('error','فشل تغيير كلمة المرور')

}

}


useEffect(()=>{

fetchStudents()
fetchSections()
fetchParents()

},[])


const filteredStudents = students.filter(s =>
s.users?.full_name?.includes(searchTerm) ||
s.national_id?.includes(searchTerm)
)


return (

<div className="space-y-6 relative">

{notification && (

<div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-3 rounded-lg shadow flex items-center gap-3
${notification.type==='success'
?'bg-emerald-50 text-emerald-800 border border-emerald-200'
:'bg-red-50 text-red-800 border border-red-200'
}`}>

<div>{notification.message}</div>

<button onClick={()=>setNotification(null)}>
<X className="h-4 w-4"/>
</button>

</div>

)}

<div className="flex justify-between items-center">

<h1 className="text-2xl font-bold">إدارة الطلاب</h1>

<button className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-md">

<Plus className="h-4 w-4"/>

إضافة طالب

</button>

</div>

<div className="bg-white p-4 rounded-xl shadow">

<div className="relative max-w-md">

<Search className="absolute right-3 top-2.5 h-5 w-5 text-slate-400"/>

<input
type="text"
placeholder="البحث بالاسم أو الرقم المدني"
value={searchTerm}
onChange={(e)=>setSearchTerm(e.target.value)}
className="w-full border rounded-md pr-10 py-2"
/>

</div>

</div>

<div className="bg-white rounded-xl shadow overflow-hidden">

<table className="min-w-full text-sm">

<thead className="bg-slate-50">

<tr>

<th className="p-3 text-right">الاسم</th>
<th className="p-3 text-right">الرقم المدني</th>
<th className="p-3 text-right">الصف</th>
<th className="p-3 text-right">ولي الأمر</th>
<th className="p-3 text-right">إجراءات</th>

</tr>

</thead>

<tbody>

{loading && (

<tr>

<td colSpan={5} className="text-center p-6">
جاري تحميل البيانات
</td>

</tr>

)}

{!loading && filteredStudents.map(student=>(

<tr key={student.id} className="border-t">

<td className="p-3">{student.users?.full_name}</td>

<td className="p-3">{student.national_id}</td>

<td className="p-3">
{student.sections?.classes?.name} - {student.sections?.name}
</td>

<td className="p-3">
{student.parents?.users?.full_name || '-'}
</td>

<td className="p-3 flex gap-2">

<button onClick={()=>handleResetPasswordClick(student)}>
<Key className="h-4 w-4"/>
</button>

<button>
<Edit className="h-4 w-4"/>
</button>

<button onClick={()=>handleDelete(student.id)}>
<Trash2 className="h-4 w-4"/>
</button>

</td>

</tr>

))}

</tbody>

</table>

</div>

{showPasswordResetModal && (

<div className="fixed inset-0 bg-black/50 flex items-center justify-center">

<div className="bg-white p-6 rounded-xl w-96 space-y-4">

<h2 className="font-bold text-lg">
إعادة تعيين كلمة المرور
</h2>

<input
type="password"
placeholder="كلمة المرور الجديدة"
value={resetPasswordForm.newPassword}
onChange={(e)=>setResetPasswordForm({...resetPasswordForm,newPassword:e.target.value})}
className="w-full border rounded-md p-2"
/>

<div className="flex justify-end gap-2">

<button
onClick={()=>setShowPasswordResetModal(false)}
className="px-3 py-2 border rounded-md"
>

إلغاء

</button>

<button
onClick={handleResetPasswordSubmit}
className="px-3 py-2 bg-indigo-600 text-white rounded-md"
>

حفظ

</button>

</div>

</div>

</div>

)}

</div>

)

}