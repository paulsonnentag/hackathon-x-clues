import React from 'react';
import { render } from 'react-dom';
import styled from 'styled-components';
import dataset from './small-dataset';
import { useDrag, useDrop } from 'react-dnd';
import { DndProvider } from 'react-dnd';
import Backend from 'react-dnd-html5-backend';
import _ from 'lodash/fp';
import _formatDecimal from 'format-decimal';


function formatDecimal(number) {
    return _formatDecimal(number).split(',')[0];
}

const ItemTypes = {
    OBJECT: 'object'
};

function parseYear(year) {
    return parseInt(year, 10);
}

const exhibitionObjects = (
    _.flow(
        _.filter(object => object.bilder.length > 0 && object.datierung),
        _.map(object => {
            const start = _.min(_.map(({ anfang }) => parseYear(anfang), object.datierung));
            const end = _.max(_.map(({ ende }) => parseYear(ende), object.datierung));

            const previewUrl = object.bilder[0].pfad.replace(/\\/g, '/').replace('Z:/Objekt/Bild', 'http://localhost:3000');

            const retrievalLocation = _.find(({ ortstyp }) => ortstyp === 'Fundort/Herkunft', object.orte);

            return {
                id: object.imdasid,
                previewUrl,
                start,
                end,
                materials: _.map(({ term }) => term, object.materialien),
                inventoryId: object.inventarnummer,
                name: object.objektbezeichnung.term,
                technology: _.map(({ term }) => term, object.techniken),
                location: retrievalLocation ? retrievalLocation.term : null,
                era: object.datierung[0].datum,
                date: `(${formatDecimal(Math.abs(start))} - ${formatDecimal(Math.abs(end))} ${end < 0 ? 'v Chr.' : 'n Chr.'})`
            };
        }),
        _.filter(({ start, end, location }) => start !== undefined && end !== undefined && location !== null),
        _.sortBy(({ start }) => start)
    )(dataset)
);

const Content = styled.div`
    display: flex;
    flex-direction: column;
    width: 100vw;
    height: 100vh;
`;


const Selection = styled.div`
    height: 100%;
    width: 100%;
    padding: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: scroll;
`;

const Gallery = styled.div`
    height: 300px;
    padding: 20px;
    padding-left: 40px;
    display: flex;
    align-items: center;
    width: 100%;
    overflow: scroll;
`;

const InfoBox = styled.div`
    width: 450px;
    border-right: 1px solid #aaa;
    padding: 40px;
    margin-bottom: 40px;
    margin-left: 20px;
    position: relative;
`;

const Comparison = styled.div`
    height: 100%;
    width: 100%;
    display: flex;
`;

const InfoProperty = styled.div`
    font-size: 20px;
    margin-bottom: 20px;
    line-height: 1.3em;
    color: #a88a49
    font-weight: bold;
`;

const InfoLabel = styled.div`
    font-size: 20px;
    line-height: 1.3em;
    color: #a88a49;    
`;

const InfoHeadline = styled.div`
    font-size: 25px;
    font-weight: bold;
    margin-bottom: 20px;
    line-height: 1.3em;
    color: #a88a49;
`;


const AppHeader = styled.div`
    font-size: 31.25px;
    padding: 20px;
`

const Button = styled.button`
    border: 1px solid #a88a49;;
    color: #a88a49;
    border-radius: 2px;    
    outline: 0;
    background: #fff;    
    font-size: 20px;
    padding: 10px;    
    font-family: Roboto;  
`;

const Center = styled.div`    
    display: flex;    
    align-items: center;
    justify-content: center;
    position: absolute;
    bottom: 20px;
    left: 0;
    right: 0;
`;

const Search = styled.div`
    display: flex;  
    height: 100px;
    align-items: center;
    padding: 20px;
    margin-top: 20px;
    margin-left: 20px;
`;

const SearchInput = styled.input`
    font-size: 20px;
    border: 1px solid #a88a49;
    padding: 10px;
    outline: 0;  
    width: 500px;  
`;

const SearchCount = styled.div`
    margin-left: 20px;
`;

const Line = styled.div`
    border-bottom: 1px solid #aaa;
    margin: 0 40px;
    margin-top: 20px; 
`;

const DropHelpMessage = styled.div`
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
`;

const DropHelpMessageInner = styled.div`
    border: 1px dashed #aaa;    
    font-size: 20px;
    width: 700px;
    height: 300px;
    padding: 20px;
    display: flex;
    align-items: center;
    justify-content: center;    
`;


const Logo = styled.div`
    background: url('logo.svg');
    background-size: contain;
    background-position: center;
    background-repeat: no-repeat;
    height: 100px;
    width: 150px;
    margin-right: 40px;    
`;

const EraInfo = styled.div`
    padding: 20px 0 20px 60px;    
`;

const EraInfoHeader = styled.div`
    font-size: 20px;    
`;

const EraInfoValue = styled.div`
    font-size: 20px;
    font-weight: bold;
`;

class App extends React.Component {

    constructor() {
        super();

        this.state = {
            focusedObjectId: null, //exhibitionObjects[0].id,
            selectedObjects: [], //[exhibitionObjects[0]],
            search: '',
            currentEra: exhibitionObjects[0].era
        };

        _.bindAll(['handleDrop', 'handleFocusObject', 'removeFocusedObject', 'handleScroll', 'updateSearch'], this);
    }

    handleDrop(object) {
        this.setState(({ selectedObjects }) => ({
            selectedObjects: selectedObjects.concat(object),
            focusedObjectId: object.id
        }));
    };

    handleFocusObject(objectId) {
        console.log('handleFocusObject', objectId);
        this.setState({ focusedObjectId: objectId });
    }

    removeFocusedObject() {
        this.setState(({ selectedObjects, focusedObjectId }) => {
            const newSelectedObjects = _.filter(({ id }) => id !== focusedObjectId, selectedObjects);

            return {
                selectedObjects: newSelectedObjects,
                focusedObjectId: newSelectedObjects[0] ? newSelectedObjects[0].id : null
            };
        });
    }

    handleScroll(evt) {
        this.updateEra();
    }

    updateEra() {
        const scrolledToId = document.elementFromPoint(50, 250).id;
        const object = exhibitionObjects.find(({ id }) => id === scrolledToId);

        if (object) {
            this.setState({ currentEra: object.era });
        }
    }

    updateSearch (search) {
        this.setState({ search });

        setTimeout(() => {
            this.updateEra();
        })
    }

    render() {
        const { selectedObjects, focusedObjectId, search, currentEra } = this.state;
        const focusedObject = exhibitionObjects.find(({ id }) => id === focusedObjectId);
        const filteredExhibitionObjects = _.filter((object) => object.name.indexOf(search) !== -1, exhibitionObjects);
        const resultCount = filteredExhibitionObjects.length;

        return (
            <DndProvider backend={Backend}>
                <Content>
                    <Search>
                       <Logo/>

                        <SearchInput
                            onChange={((evt) => this.updateSearch(evt.target.value))}
                            value={search}
                            placeholder={'Stichwort eingeben'}
                        />

                        <SearchCount>{resultCount} {resultCount === 1 ? 'gefundenes Objekt' : 'gefundenen Objekte'}</SearchCount>
                    </Search>

                    <Line/>

                    <EraInfo>
                        <EraInfoValue>
                            {currentEra}
                        </EraInfoValue>
                    </EraInfo>

                    <Gallery onScroll={this.handleScroll}>
                        {_.flow(
                            _.filter((object) => !selectedObjects.find(({ id }) => {
                                return object.id === id;
                            })),
                            _.map((object) => (
                                <ImageView
                                    key={object.id}
                                    object={object}
                                />
                            ))
                        )(filteredExhibitionObjects)}
                    </Gallery>
                    <Line/>
                    <Comparison>

                        {(selectedObjects.length > 0) && (
                            <InfoBox>
                                {focusedObject && (
                                    <>
                                        <InfoLabel>{focusedObject.inventoryId}</InfoLabel>
                                        <InfoHeadline>{focusedObject.name}</InfoHeadline>


                                        <InfoLabel>Material</InfoLabel>
                                        <InfoProperty>{focusedObject.materials.join(', ')}</InfoProperty>

                                        <InfoLabel>Technik</InfoLabel>
                                        <InfoProperty>{focusedObject.technology.slice(0, 4).join(', ')}</InfoProperty>

                                        <InfoLabel>Datierung</InfoLabel>
                                        <InfoProperty>
                                            {focusedObject.era}<br/>
                                            {focusedObject.date}
                                        </InfoProperty>

                                        <InfoLabel>Fundort</InfoLabel>
                                        <InfoProperty>{focusedObject.location}</InfoProperty>

                                        <Center>
                                            <Button onClick={() => this.removeFocusedObject()}>
                                                Objekt zurücklegen
                                            </Button>
                                        </Center>

                                    </>
                                )}
                            </InfoBox>
                        )}

                        <SelectionView
                            focusedObjectId={focusedObjectId}
                            selectedObjects={selectedObjects}
                            onDrop={this.handleDrop}
                            onFocusObject={this.handleFocusObject}
                        />
                    </Comparison>
                </Content>
            </DndProvider>
        );
    }
}

const SelectionPreviewImage = styled.img`
    max-height: 500px;
    opacity: ${({ isFocused }) => isFocused ? '1' : '0.5'}
`;

function SelectionPreview({ object, onClick, isFocused }) {
    return (
        <SelectionPreviewImage
            src={object.previewUrl}
            onClick={onClick}
            isFocused={isFocused}
        />
    );
}

function SelectionView({ onDrop, onFocusObject, selectedObjects, focusedObjectId }) {
    const [{ isOver, isOverCurrent }, drop] = useDrop({
        accept: ItemTypes.OBJECT,
        drop(item, monitor) {
            const didDrop = monitor.didDrop();
            if (didDrop) {
                return;
            }

            onDrop(item.object);
        },
        collect: monitor => ({
            isOver: monitor.isOver(),
            isOverCurrent: monitor.isOver({ shallow: true })
        })
    });

    return (
        <Selection ref={drop} isOver={{ isOver }}>
            {_.map((object) => (
                <SelectionPreview
                    object={object}
                    key={object.id}
                    onClick={() => onFocusObject(object.id)}
                    isFocused={focusedObjectId === object.id}
                />
            ), selectedObjects)}

            {selectedObjects.length === 0 && (
                <DropHelpMessage>
                    <DropHelpMessageInner>
                        <img src='vase.svg'/>

                        <div style={{paddingLeft: '20px'}}>Ziehe ein Fundstück aus dem Zeitstrahl auf den Untersuchungstisch um es genauer anzuschauen</div>
                    </DropHelpMessageInner>
                </DropHelpMessage>
            )}
        </Selection>
    );
}

const Image = styled.img`
    height: 150px;
    opacity: ${({ isDragging }) => isDragging ? 0.5 : 1};    
`;


function ImageView({ object }) {
    const [{ isDragging }, dragRef] = useDrag({
        item: { type: ItemTypes.OBJECT, object },
        collect: monitor => ({
            isDragging: monitor.isDragging()
        })
    });

    let ref;

    return (
        <div ref={(r) => {
            ref = r;
            dragRef(r);
        }}>
            <Image isDragging={isDragging}
                   src={object.previewUrl}
                   id={object.id}
            />
        </div>
    );
}


render(<App/>, document.getElementById('app'));
