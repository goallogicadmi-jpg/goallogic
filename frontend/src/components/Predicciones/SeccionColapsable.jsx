import AccordionBlock from './AccordionBlock';

/**
 * @deprecated Usar AccordionBlock. Wrapper de compatibilidad.
 */
export default function SeccionColapsable({
  titulo,
  icono,
  children,
  defaultAbierto = false,
  className = '',
}) {
  return (
    <AccordionBlock
      title={titulo}
      icon={icono}
      defaultOpen={defaultAbierto}
      className={className}
    >
      {children}
    </AccordionBlock>
  );
}
