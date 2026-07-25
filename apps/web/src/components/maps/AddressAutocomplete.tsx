import { Autocomplete, CircularProgress, TextField } from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { api } from '../../services/api';

type PlaceOption={description:string;placeId:string;mainText:string;secondaryText:string};

export function AddressAutocomplete(props:{value:string;onChange:(value:string)=>void;onPlaceSelected?:(place:PlaceOption)=>void;label?:string}){
  const [options,setOptions]=useState<PlaceOption[]>([]);const [loading,setLoading]=useState(false);
  const query=useMemo(()=>props.value.trim(),[props.value]);
  useEffect(()=>{if(query.length<3){setOptions([]);return;}const controller=new AbortController();const timer=setTimeout(async()=>{setLoading(true);try{const {data}=await api.get<PlaceOption[]>('/maps/places',{params:{q:query},signal:controller.signal});setOptions(data);}catch{setOptions([]);}finally{setLoading(false);}},350);return()=>{clearTimeout(timer);controller.abort();};},[query]);
  return <Autocomplete freeSolo filterOptions={x=>x} options={options} loading={loading} inputValue={props.value} getOptionLabel={option=>typeof option==='string'?option:option.description}
    onInputChange={(_,value)=>props.onChange(value)} onChange={(_,option)=>{if(option&&typeof option!=='string'){props.onChange(option.description);props.onPlaceSelected?.(option);}}}
    renderInput={params=><TextField {...params} fullWidth label={props.label||'Endereço'} helperText="Digite ao menos 3 caracteres para buscar no Google Places." slotProps={{input:{...params.InputProps,endAdornment:<>{loading?<CircularProgress size={18}/>:null}{params.InputProps.endAdornment}</>}}}/>}/>;
}
