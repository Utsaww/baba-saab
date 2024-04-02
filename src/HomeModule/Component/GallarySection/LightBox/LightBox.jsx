import React, { useEffect } from 'react';
import styles from "./lightBox.module.css";


const LightBox = ({children,lightBox}) => {
     useEffect(()=>{
      
        document.body.style.overflowY = "hidden"
      
      return ()=>{
        document.body.style.overflowY = "scroll"
      }
      

      }
    ,[])
  return (
    <div className={styles.mainLight}>
        {children}
        
      </div>
  )
}

export default LightBox
