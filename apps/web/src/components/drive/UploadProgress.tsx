import { LinearProgress } from '@mui/material';export function UploadProgress({value}:{value:number}){return <LinearProgress variant="determinate" value={Math.max(0,Math.min(100,value))}/>}
