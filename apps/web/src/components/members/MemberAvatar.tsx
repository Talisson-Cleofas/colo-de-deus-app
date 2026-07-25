import { Avatar } from '@mui/material';
export function MemberAvatar({name,photo,size=76}:{name:string;photo?:string;size?:number}){
 return <Avatar src={photo||undefined} alt={name} imgProps={{referrerPolicy:'no-referrer'}} sx={{width:size,height:size,bgcolor:'primary.dark',fontSize:size*.32,fontWeight:800,border:'2px solid',borderColor:'primary.main'}}>{name.split(' ').slice(0,2).map((p)=>p[0]).join('').toUpperCase()}</Avatar>
}
