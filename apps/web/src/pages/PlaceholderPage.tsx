import { ConstructionOutlined } from '@mui/icons-material';
import { Paper, Typography } from '@mui/material';
import { useParams } from 'react-router-dom';
export function PlaceholderPage(){const {section}=useParams();return <Paper sx={{p:7,textAlign:'center'}}><ConstructionOutlined sx={{fontSize:60,color:'primary.main'}}/><Typography variant="h5" fontWeight={800} mt={2}>Módulo em evolução</Typography><Typography color="text.secondary">A seção “{section}” será ampliada nas próximas sprints.</Typography></Paper>}
